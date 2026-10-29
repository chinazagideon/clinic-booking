import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.schemas.slot import SlotListResponse, SlotSchema
from src.repositories.slot_repository import SlotRepository


class SlotService:
    """Domain service managing slot listing and system reset operations."""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.slot_repo = SlotRepository(session)
        self.redis = redis_client

    async def reset_all(self, slots: list[SlotSchema]) -> dict[str, str]:
        """Replace all slots, delete all bookings, and flush Redis keys (Level 1)."""
        await self.slot_repo.replace_all_slots(slots)
        await self.redis.flushdb()
        return {"status": "ok"}

    async def list_slots(self, provider: str | None = None) -> SlotListResponse:
        """List slots ordered by earliest start time with availability status (Level 1)."""
        slots = await self.slot_repo.list_slots_with_availability(provider=provider)
        return SlotListResponse(slots=slots)
