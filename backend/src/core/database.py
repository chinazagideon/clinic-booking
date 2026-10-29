from collections.abc import AsyncGenerator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from src.core.config import get_settings


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy ORM models."""

    pass


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _normalize_database_url(raw_url: str) -> tuple[str, dict]:
    """Make hosted Postgres URLs (e.g. Neon) compatible with asyncpg.

    asyncpg rejects libpq query params such as ``sslmode`` and
    ``channel_binding``; translate ``sslmode`` into ``connect_args['ssl']``.
    """
    if raw_url.startswith("postgres://"):
        raw_url = "postgresql+asyncpg://" + raw_url[len("postgres://"):]
    elif raw_url.startswith("postgresql://"):
        raw_url = "postgresql+asyncpg://" + raw_url[len("postgresql://"):]

    parts = urlsplit(raw_url)
    params = dict(parse_qsl(parts.query))
    sslmode = params.pop("sslmode", None)
    params.pop("channel_binding", None)
    ssl_flag = params.pop("ssl", None)

    connect_args: dict = {}
    if (sslmode and sslmode != "disable") or ssl_flag in ("true", "require"):
        connect_args["ssl"] = True

    url = urlunsplit(parts._replace(query=urlencode(params)))
    return url, connect_args


def get_engine() -> AsyncEngine:
    """Create or return the global async SQLAlchemy engine singleton."""
    global _engine
    if _engine is None:
        settings = get_settings()
        url, connect_args = _normalize_database_url(settings.database_url)
        _engine = create_async_engine(
            url,
            pool_pre_ping=True,
            future=True,
            connect_args=connect_args,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Create or return the global async session factory singleton."""
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async database session per request."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        yield session


async def init_db() -> None:
    """Create all database tables on application startup."""
    import src.models.db  # noqa: F401

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Dispose database engine and session factory on shutdown."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None
