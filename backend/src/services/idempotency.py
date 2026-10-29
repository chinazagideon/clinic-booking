import hashlib
import json
from typing import Any
import redis.asyncio as redis

from src.core.config import get_settings
from src.core.exceptions import UnprocessableEntityError


class IdempotencyService:
    """Redis-backed idempotency service tracking request payloads and cached responses."""

    def __init__(self, redis_client: redis.Redis) -> None:
        self.redis = redis_client
        self.settings = get_settings()

    @staticmethod
    def _hash_payload(payload: Any) -> str:
        """Compute deterministic SHA-256 hash of canonical JSON request payload."""
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def _redis_key(self, idempotency_key: str) -> str:
        """Return Redis key for an idempotency identifier."""
        return f"idempotency:{idempotency_key}"

    async def get_cached_response(
        self, idempotency_key: str, payload: Any
    ) -> tuple[int, dict[str, Any]] | None:
        """Retrieve cached response or raise 422 if reused with a different body (Level 4)."""
        key = self._redis_key(idempotency_key)
        raw_record = await self.redis.get(key)
        if raw_record is None:
            return None

        record = json.loads(raw_record)
        expected_hash = self._hash_payload(payload)
        if record.get("body_hash") != expected_hash:
            raise UnprocessableEntityError(
                "Idempotency-Key reused with a different request body"
            )

        return int(record["status_code"]), dict(record["response_body"])

    async def save_response(
        self,
        idempotency_key: str,
        payload: Any,
        status_code: int,
        response_body: dict[str, Any],
    ) -> None:
        """Store status code and response payload in Redis under idempotency key."""
        key = self._redis_key(idempotency_key)
        record = {
            "body_hash": self._hash_payload(payload),
            "status_code": status_code,
            "response_body": response_body,
        }
        await self.redis.set(
            key,
            json.dumps(record),
            ex=self.settings.idempotency_ttl_seconds,
        )
