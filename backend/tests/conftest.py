from collections.abc import AsyncGenerator
import os
from typing import Any
import fakeredis.aioredis
import httpx
import pytest
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from src.core.config import get_settings
from src.core.database import Base, get_db_session
from src.core.redis import get_redis_client
from src.main import create_app
import src.models.db  # noqa: F401

TEST_API_KEY = "koya-secret-api-key"


@pytest.fixture
async def client() -> AsyncGenerator[httpx.AsyncClient, None]:
    settings = get_settings()
    settings.api_key = TEST_API_KEY

    test_db_url = os.getenv("TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    if test_db_url.startswith("sqlite"):
        engine = create_async_engine(
            test_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    else:
        engine = create_async_engine(test_db_url, future=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )

    test_redis_url = os.getenv("TEST_REDIS_URL")
    if test_redis_url:
        import redis.asyncio as redis
        redis_instance = redis.from_url(test_redis_url, decode_responses=True)
        await redis_instance.flushdb()
    else:
        redis_instance = fakeredis.aioredis.FakeRedis(decode_responses=True)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    def override_get_redis() -> Any:
        return redis_instance

    app = create_app()
    app.dependency_overrides[get_db_session] = override_get_db
    app.dependency_overrides[get_redis_client] = override_get_redis

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"X-API-Key": TEST_API_KEY},
    ) as ac:
        yield ac

    await redis_instance.aclose()
    await engine.dispose()
