from fastapi import APIRouter, Depends, Query, status

from src.api.deps import get_slot_service
from src.models.schemas.slot import SlotListResponse
from src.services.slot_service import SlotService

router = APIRouter(tags=["Slots"])


@router.get(
    "/slots",
    response_model=SlotListResponse,
    status_code=status.HTTP_200_OK,
    summary="Level 1 · List slots",
)
async def list_slots(
    provider: str | None = Query(
        default=None, description="Only this provider's slots (exact match)"
    ),
    service: SlotService = Depends(get_slot_service),
) -> SlotListResponse:
    """List all slots ordered earliest start first, with optional provider filtering."""
    return await service.list_slots(provider=provider)
