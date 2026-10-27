from fastapi import APIRouter, Depends, Header, Path, Query, Request, status
from fastapi.responses import JSONResponse

from src.api.deps import get_booking_service
from src.core.exceptions import BadRequestError
from src.models.schemas.booking import BookingResponse, PaginatedBookingsResponse
from src.services.booking_service import BookingService

router = APIRouter(tags=["Bookings"])


@router.post(
    "/bookings",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Book a slot (levels 1–5)",
)
async def create_booking(
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    service: BookingService = Depends(get_booking_service),
) -> JSONResponse:
    """Create a new booking with rate limiting (Level 5) and idempotency (Level 4)."""
    try:
        raw_payload = await request.json()
    except Exception as exc:
        raise BadRequestError("Invalid JSON request body") from exc

    status_code, response_body = await service.create_booking(
        raw_payload=raw_payload,
        idempotency_key=idempotency_key,
    )
    return JSONResponse(status_code=status_code, content=response_body)


@router.get(
    "/bookings",
    response_model=PaginatedBookingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Level 4 · List a person's bookings",
)
async def list_bookings(
    email: str | None = Query(default=None),
    limit: int = Query(default=10, description="1 to 50. Anything else returns 400."),
    cursor: str | None = Query(default=None),
    service: BookingService = Depends(get_booking_service),
) -> PaginatedBookingsResponse:
    """List bookings for an email using cursor pagination ordered oldest first (Level 4)."""
    return await service.list_bookings(email=email, limit=limit, cursor=cursor)


@router.get(
    "/bookings/{id}",
    response_model=BookingResponse,
    status_code=status.HTTP_200_OK,
    summary="Level 1 · Get a booking",
)
async def get_booking(
    booking_id: str = Path(..., alias="id"),
    service: BookingService = Depends(get_booking_service),
) -> BookingResponse:
    """Retrieve details of a single booking by ID (Level 1)."""
    return await service.get_booking(booking_id=booking_id)


@router.delete(
    "/bookings/{id}",
    response_model=BookingResponse,
    status_code=status.HTTP_200_OK,
    summary="Level 3 · Cancel a booking",
)
async def cancel_booking(
    booking_id: str = Path(..., alias="id"),
    service: BookingService = Depends(get_booking_service),
) -> BookingResponse:
    """Cancel a booking, release the slot, and set status to 'cancelled' (Level 3)."""
    return await service.cancel_booking(booking_id=booking_id)
