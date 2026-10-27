import redis.asyncio as redis
from src.core.config import get_settings

_redis_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    """Create or return the global async Redis client singleton."""
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = redis.from_url(
            settings.redis_url,
            decode_responses=True,
        )
    return _redis_client


async def close_redis() -> None:
    """Close the active Redis connection on application shutdown."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
