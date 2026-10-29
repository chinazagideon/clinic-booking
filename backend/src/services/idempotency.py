import asyncio
import hashlib
import json
from typing import Any
import redis.asyncio as redis

from src.core.config import get_settings
from src.core.exceptions import ConflictError, UnprocessableEntityError

# Max time an in-flight reservation lives if its owner crashes before completing.
RESERVATION_TTL_SECONDS = 30
# How long a duplicate request waits for the in-flight original to finish.
WAIT_TIMEOUT_SECONDS = 10.0
WAIT_POLL_INTERVAL_SECONDS = 0.05

_STATE_PROCESSING = "processing"
_STATE_COMPLETED = "completed"


class IdempotencyService:
    """Redis-backed idempotency service tracking request payloads and cached responses.

    Uses an atomic ``SET NX`` reservation so concurrent requests sharing a key
    (even across multiple worker processes) execute the action only once.
    """

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

    def _check_hash(self, record: dict[str, Any], payload: Any) -> None:
        if record.get("body_hash") != self._hash_payload(payload):
            raise UnprocessableEntityError(
                "Idempotency-Key reused with a different request body"
            )

    async def begin(
        self, idempotency_key: str, payload: Any
    ) -> tuple[int, dict[str, Any]] | None:
        """Atomically claim the key or resolve it against an existing record.

        Returns:
            None if the caller now owns the key and must execute the action
            (and then call ``save_response`` or ``release``); otherwise the
            cached (status_code, body) of the original request.

        Raises:
            UnprocessableEntityError: Key reused with a different body (422).
            ConflictError: Original request still in flight after the wait timeout (409).
        """
        key = self._redis_key(idempotency_key)
        reservation = json.dumps(
            {"state": _STATE_PROCESSING, "body_hash": self._hash_payload(payload)}
        )
        loop = asyncio.get_running_loop()
        deadline = loop.time() + WAIT_TIMEOUT_SECONDS

        while True:
            if await self.redis.set(
                key, reservation, nx=True, ex=RESERVATION_TTL_SECONDS
            ):
                return None

            raw_record = await self.redis.get(key)
            if raw_record is None:
                # Expired/released between SET and GET; try to claim again.
                continue

            record = json.loads(raw_record)
            self._check_hash(record, payload)

            if record.get("state") == _STATE_COMPLETED:
                return int(record["status_code"]), dict(record["response_body"])

            if loop.time() >= deadline:
                raise ConflictError(
                    "A request with this Idempotency-Key is still being processed"
                )
            await asyncio.sleep(WAIT_POLL_INTERVAL_SECONDS)

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
            "state": _STATE_COMPLETED,
            "body_hash": self._hash_payload(payload),
            "status_code": status_code,
            "response_body": response_body,
        }
        await self.redis.set(
            key,
            json.dumps(record),
            ex=self.settings.idempotency_ttl_seconds,
        )

    async def release(self, idempotency_key: str) -> None:
        """Drop an in-flight reservation so the client can retry (e.g. after a 5xx)."""
        await self.redis.delete(self._redis_key(idempotency_key))
