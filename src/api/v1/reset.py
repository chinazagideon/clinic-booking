from fastapi import APIRouter, Depends, status

from src.api.deps import get_slot_service
from src.models.schemas.slot import ResetSlotsRequest
from src.services.slot_service import SlotService

router = APIRouter(tags=["Reset"])


@router.post(
    "/reset",
    status_code=status.HTTP_200_OK,
    summary="Level 1 · Replace all slots",
)
async def reset_slots(
    payload: ResetSlotsRequest,
    service: SlotService = Depends(get_slot_service),
) -> dict[str, str]:
    """Replace all slots, delete all bookings, and reset rate limits / idempotency."""
    return await service.reset_all(payload.slots)
