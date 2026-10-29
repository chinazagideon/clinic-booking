from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, TypeAdapter, field_serializer

from src.core.exceptions import BadRequestError
from src.models.schemas.slot import format_datetime_utc

_email_adapter = TypeAdapter(EmailStr)


class NewBookingPayload(BaseModel):
    """Validated input payload for creating a new booking."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "slot_id": "s1",
                "name": "Ada Obi",
                "email": "ada@example.com",
            }
        }
    )

    slot_id: str = Field(
        ...,
        min_length=1,
        description="Unique identifier of the appointment slot to reserve",
        examples=["s1"],
    )
    name: str = Field(
        ...,
        min_length=1,
        description="Full name of the patient (leading/trailing whitespace trimmed)",
        examples=["Ada Obi"],
    )
    email: str = Field(
        ...,
        description="Patient contact email (case-insensitive, normalized to lower case)",
        examples=["ada@example.com"],
    )

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

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "b_a1b2c3d4e5f6",
                "slot_id": "s1",
                "name": "Ada Obi",
                "email": "ada@example.com",
                "status": "confirmed",
                "created_at": "2026-10-29T11:00:00Z",
            }
        },
    )

    id: str = Field(
        ...,
        description="Unique identifier generated for this booking reservation",
        examples=["b_a1b2c3d4e5f6"],
    )
    slot_id: str = Field(
        ...,
        description="Identifier of the reserved slot",
        examples=["s1"],
    )
    name: str = Field(
        ...,
        description="Patient name associated with the reservation",
        examples=["Ada Obi"],
    )
    email: str = Field(
        ...,
        description="Normalized lower-case patient email address",
        examples=["ada@example.com"],
    )
    status: Literal["confirmed", "cancelled"] = Field(
        ...,
        description="Current status of the reservation ('confirmed' or 'cancelled')",
        examples=["confirmed"],
    )
    created_at: datetime = Field(
        ...,
        description="UTC creation timestamp in ISO-8601 format",
        examples=["2026-10-29T11:00:00Z"],
    )

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> str:
        """Serialize creation timestamp to UTC ISO string with Z suffix."""
        return format_datetime_utc(dt)


class PaginatedBookingsResponse(BaseModel):
    """Response DTO for cursor-paginated bookings list."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "bookings": [
                    {
                        "id": "b_a1b2c3d4e5f6",
                        "slot_id": "s1",
                        "name": "Ada Obi",
                        "email": "ada@example.com",
                        "status": "confirmed",
                        "created_at": "2026-10-29T11:00:00Z",
                    }
                ],
                "next_cursor": "MjAyNi0xMC0yOVQxMTowMDowMFp8Yl9hMWIyYzNkNGU1ZjY=",
            }
        }
    )

    bookings: list[BookingResponse] = Field(
        ...,
        description="List of patient bookings on the current page, sorted chronologically (oldest first)",
    )
    next_cursor: str | None = Field(
        default=None,
        description="Opaque base64 cursor token to request the subsequent page. Evaluates to null on the terminal page.",
        examples=["MjAyNi0xMC0yOVQxMTowMDowMFp8Yl9hMWIyYzNkNGU1ZjY="],
    )
