from datetime import datetime
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.db.booking import BookingModel


class BookingRepository:
    """Data access repository for booking records and cursor pagination queries."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def has_confirmed_booking(self, slot_id: str) -> bool:
        """Check whether a confirmed booking already exists for a slot."""
        stmt = select(BookingModel.id).where(
            BookingModel.slot_id == slot_id,
            BookingModel.status == "confirmed",
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def create_booking(self, booking: BookingModel) -> BookingModel:
        """Add and flush a new booking model into the database session."""
        self.session.add(booking)
        await self.session.flush()
        return booking

    async def get_booking_by_id(
        self, booking_id: str, for_update: bool = False
    ) -> BookingModel | None:
        """Fetch a single booking by ID with optional row locking."""
        stmt = select(BookingModel).where(BookingModel.id == booking_id)
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_bookings_by_email(
        self,
        email: str,
        limit: int,
        cursor_created_at: datetime | None = None,
        cursor_id: str | None = None,
    ) -> list[BookingModel]:
        """Fetch up to limit + 1 bookings for an email ordered oldest first."""
        normalized_email = email.strip().lower()
        stmt = select(BookingModel).where(
            func.lower(BookingModel.email) == normalized_email
        )

        if cursor_created_at is not None and cursor_id is not None:
            stmt = stmt.where(
                or_(
                    BookingModel.created_at > cursor_created_at,
                    and_(
                        BookingModel.created_at == cursor_created_at,
                        BookingModel.id > cursor_id,
                    ),
                )
            )

        stmt = stmt.order_by(
            BookingModel.created_at.asc(),
            BookingModel.id.asc(),
        ).limit(limit + 1)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())
