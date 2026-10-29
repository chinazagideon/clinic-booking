from fastapi import APIRouter, Depends, status

from src.api.deps import get_slot_service
from src.models.schemas.slot import ResetSlotsRequest
from src.services.slot_service import SlotService

router = APIRouter(tags=["Reset"])


@router.post(
    "/reset",
    status_code=status.HTTP_200_OK,
    summary="Reset schedule and administrative state",
    response_description="Confirmation of successful schedule reset",
    responses={
        200: {
            "description": "All slots replaced, existing bookings deleted, and cache counters cleared.",
            "content": {
                "application/json": {
                    "example": {"status": "ok"}
                }
            },
        },
        400: {
            "description": "Invalid request payload or malformed slot timestamps.",
            "content": {
                "application/json": {
                    "example": {"error": "Field cannot be empty"}
                }
            },
        },
        401: {
            "description": "Missing or invalid X-API-Key header.",
            "content": {
                "application/json": {
                    "example": {"error": "Missing or invalid API key"}
                }
            },
        },
    },
)
async def reset_slots(
    payload: ResetSlotsRequest,
    service: SlotService = Depends(get_slot_service),
) -> dict[str, str]:
    """Replace all slots, delete all bookings, and reset rate limits and idempotency state.

    ### How to leverage this endpoint:
    Use this administrative endpoint during testing, automated CI/CD runs, or environment setup to establish a clean schedule state.

    - **Wipes Database**: Purges all existing booking records and existing slot definitions.
    - **Seeds New Slots**: Populates the clinic timetable with the provided `slots` array (past dates are accepted for historical seeding).
    - **Flushes Redis**: Resets sliding-window rate limit counters and cached idempotency keys immediately.

    #### Required Headers:
    - `X-API-Key`: Your configured clinic API secret key.

    #### Example cURL:
    ```bash
    curl -X POST "http://localhost:8000/reset" \\
      -H "X-API-Key: secret123" \\
      -H "Content-Type: application/json" \\
      -d '{
        "slots": [
          {
            "id": "s1",
            "provider": "Dr Ade",
            "start": "2026-12-10T09:00:00Z",
            "end": "2026-12-10T09:30:00Z"
          },
          {
            "id": "s2",
            "provider": "Dr Ade",
            "start": "2026-12-10T10:00:00Z",
            "end": "2026-12-10T10:30:00Z"
          }
        ]
      }'
    ```
    """
    return await service.reset_all(payload.slots)
