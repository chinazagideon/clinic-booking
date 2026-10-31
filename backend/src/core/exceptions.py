from typing import Any
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    """Base application exception enforcing contract error shape."""

    status_code: int = status.HTTP_400_BAD_REQUEST

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.headers = headers or {}


class BadRequestError(AppError):
    """Raised for invalid or missing request parameters (HTTP 400)."""

    status_code = status.HTTP_400_BAD_REQUEST


class UnauthorizedError(AppError):
    """Raised for missing or incorrect X-API-Key header (HTTP 401)."""

    status_code = status.HTTP_401_UNAUTHORIZED


class NotFoundError(AppError):
    """Raised when a requested resource is not found (HTTP 404)."""

    status_code = status.HTTP_404_NOT_FOUND


class ConflictError(AppError):
    """Raised for conflicting state such as double bookings (HTTP 409)."""

    status_code = status.HTTP_409_CONFLICT


class SlotNotFoundError(NotFoundError):
    """Raised when an appointment slot does not exist (HTTP 404)."""

    def __init__(self, message: str = "Slot not found") -> None:
        super().__init__(message=message)


class SlotAlreadyStartedError(BadRequestError):
    """Raised when an appointment slot has already started (HTTP 400)."""

    def __init__(self, message: str = "Slot has already started") -> None:
        super().__init__(message=message)


class SlotAlreadyBookedError(ConflictError):
    """Raised when an appointment slot already has a confirmed booking (HTTP 409)."""

    def __init__(self, message: str = "Slot is already booked") -> None:
        super().__init__(message=message)


class UnprocessableEntityError(AppError):
    """Raised for idempotency key payload mismatches (HTTP 422)."""

    status_code: int = 422


class RateLimitExceededError(AppError):
    """Raised when an email exceeds attempt rate limits (HTTP 429)."""

    status_code = status.HTTP_429_TOO_MANY_REQUESTS

    def __init__(self, message: str, retry_after: int) -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            headers={"Retry-After": str(max(1, int(retry_after)))},
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register centralized exception handlers enforcing {"error": "<message>"}."""

    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message},
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors: list[Any] = exc.errors()
        if errors:
            first = errors[0]
            loc = ".".join(str(part) for part in first.get("loc", []) if part != "body")
            msg = first.get("msg", "Invalid request")
            error_msg = f"{loc}: {msg}" if loc else msg
        else:
            error_msg = "Invalid request parameters"
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": error_msg},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        _request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": detail},
            headers=getattr(exc, "headers", None) or {},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        _request: Request, _exc: Exception
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Internal server error"},
        )
