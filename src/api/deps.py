from fastapi import Depends
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.redis import get_redis_client
from src.services.booking_service import BookingService
from src.services.slot_service import SlotService


async def get_slot_service(
    session: AsyncSession = Depends(get_db_session),
    redis_client: redis.Redis = Depends(get_redis_client),
) -> SlotService:
    """Dependency provider for SlotService instance."""
    return SlotService(session=session, redis_client=redis_client)


async def get_booking_service(
    session: AsyncSession = Depends(get_db_session),
    redis_client: redis.Redis = Depends(get_redis_client),
) -> BookingService:
    """Dependency provider for BookingService instance."""
    return BookingService(session=session, redis_client=redis_client)
