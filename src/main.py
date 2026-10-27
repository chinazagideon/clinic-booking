from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from fastapi import FastAPI

from src.api.router import api_router
from src.core.config import get_settings
from src.core.database import close_db, init_db
from src.core.exceptions import register_exception_handlers
from src.core.redis import close_redis


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown lifecycle."""
    await init_db()
    yield
    await close_redis()
    await close_db()


def create_app() -> FastAPI:
    """Build and configure the FastAPI application instance."""
    settings = get_settings()
    app = FastAPI(
        title=settings.app_title,
        version=settings.app_version,
        description=(
            "Clinic Booking API."
        ),
        lifespan=lifespan,
    )

    register_exception_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
