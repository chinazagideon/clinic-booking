import asyncio
import base64
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any
import uuid
import redis.asyncio as redis
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import (
    AppError,
    BadRequestError,
    ConflictError,
    NotFoundError,
    RateLimitExceededError,
    UnprocessableEntityError,
)
from src.models.db.booking import BookingModel
from src.models.schemas.booking import (
    BookingResponse,
    NewBookingPayload,
    PaginatedBookingsResponse,
)
from src.models.schemas.slot import format_datetime_utc
from src.repositories.booking_repository import BookingRepository
from src.repositories.slot_repository import SlotRepository
from src.services.idempotency import IdempotencyService
from src.services.rate_limiter import RateLimiterService

MAX_IDEMPOTENCY_KEY_LENGTH = 255

_slot_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)


class BookingService:
    """Core domain service orchestrating booking lifecycle, concurrency,

    idempotency, rate limiting, and cursor-based pagination (Levels 1–5).
    """

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        """Initialize BookingService with database session and Redis client.

        Args:
            session: Active asynchronous SQLAlchemy database session.
            redis_client: Active asynchronous Redis client connection.
        """
        self.session = session
        self.slot_repo = SlotRepository(session)
        self.booking_repo = BookingRepository(session)
        self.rate_limiter = RateLimiterService(redis_client)
        self.idempotency = IdempotencyService(redis_client)

    async def create_booking(
        self,
        raw_payload: Any,
        idempotency_key: str | None = None,
    ) -> tuple[int, dict[str, Any], bool]:
        """Create a new booking with idempotency and rate limiting safeguards.

        Handles:
        - Level 5: Rate limit check per email (max 5 attempts/minute).
        - Level 4: Idempotency-Key replay (same body -> same response; different body -> 422).
        - Levels 1-3: Slot validation, concurrency row lock, and DB insertion.

        Args:
            raw_payload: The unvalidated JSON request body dictionary.
            idempotency_key: Optional Idempotency-Key HTTP header value.

        Returns:
            A tuple of (http_status_code, response_payload_dict, is_replayed).

        Raises:
            RateLimitExceededError: When email attempt limit is exceeded (HTTP 429).
            UnprocessableEntityError: When an idempotency key is reused with a different body (HTTP 422).
            BadRequestError: When request payload validation fails or slot is in the past (HTTP 400).
            NotFoundError: When slot does not exist (HTTP 404).
            ConflictError: When slot is already booked (HTTP 409).
        """
        raw_email = (
            raw_payload.get("email") if isinstance(raw_payload, dict) else None
        )
        clean_idem_key = idempotency_key.strip() if idempotency_key else None
        if clean_idem_key and len(clean_idem_key) > MAX_IDEMPOTENCY_KEY_LENGTH:
            raise BadRequestError(
                f"Idempotency-Key must be at most {MAX_IDEMPOTENCY_KEY_LENGTH} characters"
            )

        # Handle Level 4: Idempotency-Key workflow
        if clean_idem_key:
            # Atomically claim the key (safe across workers) or resolve it
            # against the original request.
            try:
                cached = await self.idempotency.begin(clean_idem_key, raw_payload)
            except UnprocessableEntityError:
                # Payload mismatch (422) counts as a failed attempt towards rate limit
                await self.rate_limiter.check_and_record_attempt(raw_email)
                raise

            # Replay identical previous response without repeating side-effects
            if cached is not None:
                return cached[0], cached[1], True

            # We own the key from here on; any non-cached outcome must release it.
            try:
                # Record rate-limiting attempt before executing initial action
                await self.rate_limiter.check_and_record_attempt(raw_email)
                status_code, response_body = await self._execute_booking_creation(
                    raw_payload
                )
            except AppError as exc:
                if isinstance(exc, RateLimitExceededError):
                    # Rate-limited attempts are not cached; client may retry later
                    await self.idempotency.release(clean_idem_key)
                else:
                    # Cache failed attempt response under this idempotency key
                    await self.idempotency.save_response(
                        clean_idem_key,
                        raw_payload,
                        exc.status_code,
                        {"error": exc.message},
                    )
                raise
            except BaseException:
                # Unexpected failure: free the key so the client can retry
                await self.idempotency.release(clean_idem_key)
                raise

            # Cache successful creation response under this idempotency key
            await self.idempotency.save_response(
                clean_idem_key,
                raw_payload,
                status_code,
                response_body,
            )
            return status_code, response_body, False

        # Non-idempotent request: record attempt and create booking
        await self.rate_limiter.check_and_record_attempt(raw_email)
        status_code, response_body = await self._execute_booking_creation(raw_payload)
        return status_code, response_body, False

    async def _execute_booking_creation(
        self, raw_payload: Any
    ) -> tuple[int, dict[str, Any]]:
        """Validate input fields and execute atomic booking creation in the database.

        Enforces:
        - Level 2: Field presence, whitespace trimming, lowercase email, valid email syntax.
        - Level 2: Slot exists (404) and has not already started (400).
        - Level 3: Concurrency protection via row locking (`SELECT FOR UPDATE`),
          preventing double bookings (409).

        Args:
            raw_payload: The raw request body dictionary.

        Returns:
            Tuple of (201, serialized_booking_response_dict).
        """
        # Validate payload and sanitize inputs (strip whitespace, lowercase email)
        payload = NewBookingPayload.validate_raw(raw_payload)

        # Acquire lock for the targeted slot to serialize concurrent requests
        async with _slot_locks[payload.slot_id]:
            # Lock the slot row in the database
            slot = await self.slot_repo.get_slot_for_update(payload.slot_id)
            if slot is None:
                raise NotFoundError("Slot not found")

            # Check if slot start time has already passed
            slot_start = (
                slot.start.replace(tzinfo=timezone.utc)
                if slot.start.tzinfo is None
                else slot.start.astimezone(timezone.utc)
            )
            now = datetime.now(timezone.utc)
            if slot_start <= now:
                raise BadRequestError("Slot has already started")

            # Verify slot does not already have an active confirmed booking
            already_booked = await self.booking_repo.has_confirmed_booking(
                payload.slot_id
            )
            if already_booked:
                raise ConflictError("Slot is already booked")

            # Create confirmed booking record
            booking = BookingModel(
                id=f"b_{uuid.uuid4().hex[:12]}",
                slot_id=payload.slot_id,
                name=payload.name,
                email=payload.email,
                status="confirmed",
                created_at=now,
            )

            try:
                await self.booking_repo.create_booking(booking)
                await self.session.commit()
            except IntegrityError as exc:
                await self.session.rollback()
                raise ConflictError("Slot is already booked") from exc

            response_dto = BookingResponse.model_validate(booking)
            return 201, response_dto.model_dump(mode="json")

    async def get_booking(self, booking_id: str) -> BookingResponse:
        """Retrieve a booking by its unique identifier (Level 1).

        Args:
            booking_id: The unique ID of the booking to fetch.

        Returns:
            The booking response model.

        Raises:
            NotFoundError: If no booking exists with the given ID (HTTP 404).
        """
        booking = await self.booking_repo.get_booking_by_id(booking_id)
        if booking is None:
            raise NotFoundError("No booking with that id")
        return BookingResponse.model_validate(booking)

    async def cancel_booking(self, booking_id: str) -> BookingResponse:
        """Cancel an existing booking and free its associated slot (Level 3).

        Args:
            booking_id: The unique ID of the booking to cancel.

        Returns:
            The updated booking model with status set to 'cancelled'.

        Raises:
            NotFoundError: If no booking exists with the given ID (HTTP 404).
            ConflictError: If the booking was already cancelled (HTTP 409).
        """
        booking = await self.booking_repo.get_booking_by_id(
            booking_id, for_update=True
        )
        if booking is None:
            raise NotFoundError("No booking with that id")

        if booking.status == "cancelled":
            raise ConflictError("Booking is already cancelled")

        # Mark as cancelled and release slot for new bookings
        booking.status = "cancelled"
        await self.session.commit()
        await self.session.refresh(booking)
        return BookingResponse.model_validate(booking)

    async def list_bookings(
        self,
        email: str | None,
        limit: int = 10,
        cursor: str | None = None,
    ) -> PaginatedBookingsResponse:
        """List bookings for a specific person using cursor pagination (Level 4).

        Results are ordered oldest first (by created_at ASC, id ASC).
        Email matching is case-insensitive.

        Args:
            email: Required email query parameter.
            limit: Page size between 1 and 50 (defaults to 10).
            cursor: Opaque cursor string received from next_cursor of previous page.

        Returns:
            PaginatedBookingsResponse containing the list of bookings and next_cursor.

        Raises:
            BadRequestError: If email is missing, limit is outside [1, 50], or cursor is invalid.
        """
        if email is None or not email.strip():
            raise BadRequestError("email query parameter is required")

        if limit < 1 or limit > 50:
            raise BadRequestError("limit must be between 1 and 50")

        cursor_created_at: datetime | None = None
        cursor_id: str | None = None

        if cursor is not None and cursor != "":
            cursor_created_at, cursor_id = self._decode_cursor(cursor)

        # Query database for limit + 1 items to determine if a next page exists
        rows = await self.booking_repo.list_bookings_by_email(
            email=email,
            limit=limit,
            cursor_created_at=cursor_created_at,
            cursor_id=cursor_id,
        )

        has_more = len(rows) > limit
        page_rows = rows[:limit]

        next_cursor: str | None = None
        if has_more and page_rows:
            last_row = page_rows[-1]
            next_cursor = self._encode_cursor(last_row.created_at, last_row.id)

        return PaginatedBookingsResponse(
            bookings=[BookingResponse.model_validate(row) for row in page_rows],
            next_cursor=next_cursor,
        )

    @staticmethod
    def _encode_cursor(created_at: datetime, booking_id: str) -> str:
        """Encode timestamp and booking ID into an opaque, URL-safe base64 cursor.

        Args:
            created_at: Datetime of the last booking on current page.
            booking_id: Unique ID of the last booking on current page.

        Returns:
            URL-safe base64 encoded cursor string.
        """
        raw = f"{format_datetime_utc(created_at)}|{booking_id}"
        return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii")

    @staticmethod
    def _decode_cursor(cursor: str) -> tuple[datetime, str]:
        """Decode and validate an opaque URL-safe base64 cursor string.

        Args:
            cursor: URL-safe base64 encoded cursor string.

        Returns:
            Tuple of (parsed_datetime, booking_id).

        Raises:
            BadRequestError: If cursor format is invalid or cannot be decoded.
        """
        try:
            decoded = base64.urlsafe_b64decode(cursor.encode("ascii")).decode("utf-8")
            ts_str, booking_id = decoded.split("|", 1)
            if not booking_id:
                raise ValueError("Missing booking id in cursor")
            dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt, booking_id
        except Exception as exc:
            raise BadRequestError("Invalid cursor") from exc
