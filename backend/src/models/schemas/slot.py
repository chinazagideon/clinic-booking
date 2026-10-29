from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


def format_datetime_utc(dt: datetime) -> str:
    """Format datetime object into an ISO-8601 UTC string with 'Z' suffix."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


class SlotSchema(BaseModel):
    """Schema representing an appointment slot."""

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "s1",
                "provider": "Dr Ade",
                "start": "2026-12-10T09:00:00Z",
                "end": "2026-12-10T09:30:00Z",
            }
        },
    )

    id: str = Field(
        ...,
        min_length=1,
        description="Unique identifier for the appointment slot",
        examples=["s1"],
    )
    provider: str = Field(
        ...,
        min_length=1,
        description="Name of the doctor or healthcare practitioner",
        examples=["Dr Ade"],
    )
    start: datetime = Field(
        ...,
        description="Slot starting time in UTC (ISO-8601)",
        examples=["2026-12-10T09:00:00Z"],
    )
    end: datetime = Field(
        ...,
        description="Slot concluding time in UTC (ISO-8601)",
        examples=["2026-12-10T09:30:00Z"],
    )

    @field_validator("id", "provider")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        """Reject empty or whitespace-only strings."""
        if not v or not v.strip():
            raise ValueError("Field cannot be empty")
        return v

    @field_validator("start", "end")
    @classmethod
    def ensure_tz_aware(cls, v: datetime) -> datetime:
        """Ensure datetime has timezone awareness, defaulting to UTC."""
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

    @field_serializer("start", "end")
    def serialize_dt(self, dt: datetime) -> str:
        """Serialize datetime to UTC ISO string with Z suffix."""
        return format_datetime_utc(dt)


class SlotWithAvailabilitySchema(SlotSchema):
    """Schema representing a slot with booking availability status."""

    available: bool = Field(
        ...,
        description="Whether the slot is currently open for booking (false if an active confirmed booking exists)",
        examples=[True],
    )


class ResetSlotsRequest(BaseModel):
    """Request payload for POST /reset."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "slots": [
                    {
                        "id": "s1",
                        "provider": "Dr Ade",
                        "start": "2026-12-10T09:00:00Z",
                        "end": "2026-12-10T09:30:00Z",
                    },
                    {
                        "id": "s2",
                        "provider": "Dr Ade",
                        "start": "2026-12-10T10:00:00Z",
                        "end": "2026-12-10T10:30:00Z",
                    },
                ]
            }
        }
    )

    slots: list[SlotSchema] = Field(
        ...,
        description="Complete list of appointment slots to seed. All previous bookings and slots will be replaced.",
    )


class SlotListResponse(BaseModel):
    """Response payload for GET /slots."""

    slots: list[SlotWithAvailabilitySchema] = Field(
        ...,
        description="List of appointment slots matching query criteria, ordered chronologically by earliest start time.",
    )
