from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.core.exceptions import SlotAlreadyBookedError, SlotAlreadyStartedError


class SlotModel(Base):
    """SQLAlchemy model representing a doctor appointment slot."""

    __tablename__ = "slots"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    provider: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    bookings = relationship(
        "BookingModel",
        back_populates="slot",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_slots_start_id", "start", "id"),
        Index("uq_slots_start", "start", unique=True),
        Index("uq_slots_start_end", "start", "end", unique=True),
        CheckConstraint("end > start", name="ck_slots_end_after_start"),
    )

    def assert_bookable(self, now: datetime, already_booked: bool = False) -> None:
        """Enforce domain invariants for slot reservation eligibility.

        Args:
            now: Current timestamp in UTC for start time comparison.
            already_booked: Whether a confirmed booking exists for this slot.

        Raises:
            SlotAlreadyStartedError: If the slot start time has already passed.
            SlotAlreadyBookedError: If an active confirmed booking exists.
        """
        slot_start = (
            self.start.replace(tzinfo=timezone.utc)
            if self.start.tzinfo is None
            else self.start.astimezone(timezone.utc)
        )
        if slot_start <= now:
            raise SlotAlreadyStartedError()

        if already_booked:
            raise SlotAlreadyBookedError()
