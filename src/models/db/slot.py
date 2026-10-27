from datetime import datetime
from sqlalchemy import DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


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
    )
