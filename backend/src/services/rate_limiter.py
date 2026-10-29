import math
import time
import uuid
import redis.asyncio as redis

from src.core.config import get_settings
from src.core.exceptions import RateLimitExceededError


class RateLimiterService:
    """Sliding-window rate limiter per email using Redis sorted sets (Level 5)."""

    def __init__(self, redis_client: redis.Redis) -> None:
        self.redis = redis_client
        self.settings = get_settings()

    async def check_and_record_attempt(self, raw_email: str | None) -> None:
        """Record attempt for email and raise HTTP 429 if exceeding max attempts/minute."""
        if not raw_email or not isinstance(raw_email, str):
            return
        email = raw_email.strip().lower()
        if not email:
            return

        key = f"ratelimit:{email}"
        now = time.time()
        window = float(self.settings.rate_limit_window_seconds)
        max_attempts = self.settings.rate_limit_max_attempts
        window_start = now - window

        await self.redis.zremrangebyscore(key, "-inf", window_start)
        current_count = await self.redis.zcard(key)

        if current_count >= max_attempts:
            oldest_entries = await self.redis.zrange(key, 0, 0, withscores=True)
            if oldest_entries:
                oldest_timestamp = float(oldest_entries[0][1])
                elapsed = now - oldest_timestamp
                retry_after = max(1, math.ceil(window - elapsed))
            else:
                retry_after = int(window)

            raise RateLimitExceededError(
                message="Too many booking attempts for this email. Please try again later.",
                retry_after=retry_after,
            )

        member = f"{now}:{uuid.uuid4().hex}"
        await self.redis.zadd(key, {member: now})
        await self.redis.expire(key, int(window) + 10)
