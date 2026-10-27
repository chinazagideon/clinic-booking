from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, TypeAdapter, field_serializer

from src.core.exceptions import BadRequestError
from src.models.schemas.slot import format_datetime_utc

_email_adapter = TypeAdapter(EmailStr)


class NewBookingPayload(BaseModel):
    """Validated input payload for creating a new booking."""

    slot_id: str
    name: str
    email: str

    @classmethod
    def validate_raw(cls, data: object) -> "NewBookingPayload":
        """Validate raw request data, enforce non-empty fields and valid email."""
        if not isinstance(data, dict):
            raise BadRequestError("Request body must be a JSON object")

        raw_slot_id = data.get("slot_id")
        raw_name = data.get("name")
        raw_email = data.get("email")

        if not isinstance(raw_slot_id, str) or not raw_slot_id.strip():
            raise BadRequestError("slot_id is required and cannot be empty")

        if not isinstance(raw_name, str) or not raw_name.strip():
            raise BadRequestError("name is required and cannot be empty")

        if not isinstance(raw_email, str) or not raw_email.strip():
            raise BadRequestError("email is required and cannot be empty")

        cleaned_slot_id = raw_slot_id.strip()
        cleaned_name = raw_name.strip()
        cleaned_email = raw_email.strip().lower()

        try:
            _email_adapter.validate_python(cleaned_email)
        except Exception as exc:
            raise BadRequestError("Invalid email address") from exc

        return cls(
            slot_id=cleaned_slot_id,
            name=cleaned_name,
            email=cleaned_email,
        )


class BookingResponse(BaseModel):
    """Response DTO representing a clinic booking."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    slot_id: str
    name: str
    email: str
    status: Literal["confirmed", "cancelled"]
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> str:
        """Serialize creation timestamp to UTC ISO string with Z suffix."""
        return format_datetime_utc(dt)


class PaginatedBookingsResponse(BaseModel):
    """Response DTO for cursor-paginated bookings list."""

    bookings: list[BookingResponse]
    next_cursor: str | None
