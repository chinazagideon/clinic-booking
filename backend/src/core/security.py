import secrets
from fastapi import Depends, Security
from fastapi.security import APIKeyHeader

from src.core.config import Settings, get_settings
from src.core.exceptions import UnauthorizedError

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(
    api_key: str | None = Security(api_key_header),
    settings: Settings = Depends(get_settings),
) -> str:
    """Validate X-API-Key header against configured secret key (HTTP 401 on mismatch)."""
    if not api_key or not secrets.compare_digest(api_key, settings.api_key):
        raise UnauthorizedError("Missing or invalid API key")
    return api_key
