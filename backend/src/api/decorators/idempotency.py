import functools
import json
from collections.abc import Callable
from typing import Any
from fastapi import Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import redis.asyncio as redis

from src.core.exceptions import (
    AppError,
    BadRequestError,
    RateLimitExceededError,
    UnprocessableEntityError,
)
from src.core.redis import get_redis_client
from src.services.idempotency import IdempotencyService
from src.services.rate_limiter import RateLimiterService

MAX_IDEMPOTENCY_KEY_LENGTH = 255


def _serialize_endpoint_result(
    result: Any, default_status_code: int = status.HTTP_201_CREATED
) -> tuple[int, dict[str, Any]]:
    """Convert route handler return value into HTTP status code and serializable dictionary."""
    if isinstance(result, BaseModel):
        return default_status_code, result.model_dump(mode="json")
    if isinstance(result, JSONResponse):
        body = json.loads(result.body.decode()) if result.body else {}
        return result.status_code, body
    if isinstance(result, tuple) and len(result) >= 2:
        return int(result[0]), dict(result[1])
    if isinstance(result, dict):
        return default_status_code, result
    return default_status_code, {"data": result}


def idempotent_action(
    key_header: str = "Idempotency-Key",
    rate_limit_field: str = "email",
    default_status_code: int = status.HTTP_201_CREATED,
) -> Callable[..., Any]:
    """Decorator managing idempotency caching and sliding-window rate limiting.

    Cross-cutting transport decorator that:
    - Validates key length constraints.
    - Resolves idempotency replays and payload mismatch conflicts (HTTP 422).
    - Records rate limit attempts per email (including for failed domain validations).
    - Saves successful and failed responses under the idempotency key for exact replay.
    - Releases reservation locks on rate-limit breaches or unexpected crashes.
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> JSONResponse:
            request: Request | None = kwargs.get("request")
            if request is None:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            if request is None:
                raise RuntimeError("idempotent_action decorator requires a Request argument")

            # Parse and cache raw request body
            raw_payload = getattr(request.state, "raw_payload", None)
            if raw_payload is None:
                try:
                    raw_payload = await request.json()
                except Exception as exc:
                    raise BadRequestError("Invalid JSON request body") from exc
                request.state.raw_payload = raw_payload

            # Extract rate limit field
            raw_email = (
                raw_payload.get(rate_limit_field)
                if isinstance(raw_payload, dict)
                else None
            )

            # Extract idempotency key
            raw_key = (
                kwargs.get("idempotency_key")
                or request.headers.get(key_header)
            )
            clean_key = raw_key.strip() if raw_key else None
            if clean_key and len(clean_key) > MAX_IDEMPOTENCY_KEY_LENGTH:
                raise BadRequestError(
                    f"{key_header} must be at most {MAX_IDEMPOTENCY_KEY_LENGTH} characters"
                )

            # Resolve redis client from dependencies or singleton
            redis_client = kwargs.get("redis_client")
            if redis_client is None or not isinstance(redis_client, redis.Redis):
                redis_client = get_redis_client()

            idempotency = IdempotencyService(redis_client)
            rate_limiter = RateLimiterService(redis_client)

            if not clean_key:
                # Non-idempotent request: record attempt and execute
                await rate_limiter.check_and_record_attempt(raw_email)
                result = await func(*args, **kwargs)
                status_code, content = _serialize_endpoint_result(
                    result, default_status_code=default_status_code
                )
                return JSONResponse(status_code=status_code, content=content)

            # Idempotent workflow: claim reservation or resolve cached replay
            try:
                cached = await idempotency.begin(clean_key, raw_payload)
            except UnprocessableEntityError:
                # Payload mismatch (422) counts as a failed attempt towards rate limit
                await rate_limiter.check_and_record_attempt(raw_email)
                raise

            if cached is not None:
                # Safe replay of original outcome
                return JSONResponse(
                    status_code=cached[0],
                    content=cached[1],
                    headers={"Idempotent-Replayed": "true"},
                )

            # Caller owns the key; execute action and capture results
            try:
                await rate_limiter.check_and_record_attempt(raw_email)
                result = await func(*args, **kwargs)
                status_code, content = _serialize_endpoint_result(
                    result, default_status_code=default_status_code
                )
            except AppError as exc:
                if isinstance(exc, RateLimitExceededError):
                    # Rate-limited attempts are not cached so clients can retry later
                    await idempotency.release(clean_key)
                else:
                    # Failed validations (400, 404, 409) are cached under this key
                    await idempotency.save_response(
                        clean_key,
                        raw_payload,
                        exc.status_code,
                        {"error": exc.message},
                    )
                raise
            except BaseException:
                # Free reservation on unhandled exception
                await idempotency.release(clean_key)
                raise

            # Cache successful response under this idempotency key
            await idempotency.save_response(
                clean_key,
                raw_payload,
                status_code,
                content,
            )
            return JSONResponse(status_code=status_code, content=content)

        return wrapper

    return decorator
