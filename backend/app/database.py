import json
import os
import tempfile
import threading
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Callable, TypeVar

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


T = TypeVar("T")

DEFAULT_DATABASE_URL = "sqlite+aiosqlite:///backend/data/uslike.db"


def normalize_database_url(value: str) -> str:
    """Return a SQLAlchemy async URL from common provider-style database URLs."""

    database_url = value.strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL must not be empty")
    if database_url.startswith("postgres://"):
        database_url = f"postgresql+asyncpg://{database_url.removeprefix('postgres://')}"
    elif database_url.startswith("postgresql://"):
        database_url = f"postgresql+asyncpg://{database_url.removeprefix('postgresql://')}"
    elif database_url.startswith("sqlite://") and not database_url.startswith(
        "sqlite+aiosqlite://"
    ):
        database_url = f"sqlite+aiosqlite://{database_url.removeprefix('sqlite://')}"

    try:
        parsed = make_url(database_url)
    except Exception as error:  # SQLAlchemy provides several URL parse exceptions.
        raise RuntimeError("DATABASE_URL is not a valid SQLAlchemy database URL") from error
    if parsed.get_backend_name() not in {"postgresql", "sqlite"}:
        raise RuntimeError("DATABASE_URL must use PostgreSQL or SQLite")
    if not parsed.drivername.endswith(("asyncpg", "aiosqlite")):
        raise RuntimeError("DATABASE_URL must use an asyncpg or aiosqlite driver")
    return database_url


class Database:
    """Async SQLAlchemy engine/session lifecycle shared by the application."""

    def __init__(self, database_url: str, *, echo: bool = False):
        self.url = normalize_database_url(database_url)
        engine_options: dict[str, Any] = {"echo": echo, "pool_pre_ping": True}
        if make_url(self.url).get_backend_name() == "sqlite":
            # SQLite is a deterministic local/test fallback. Production uses PostgreSQL.
            engine_options["pool_pre_ping"] = False
        self.engine: AsyncEngine = create_async_engine(self.url, **engine_options)
        self.session_factory = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        async with self.session_factory() as session:
            yield session

    async def ping(self) -> None:
        async with self.engine.connect() as connection:
            await connection.execute(text("SELECT 1"))

    async def create_schema(self) -> None:
        """Create tables for isolated tests/local SQLite; production uses Alembic."""

        from .db_models import Base

        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    async def drop_schema(self) -> None:
        from .db_models import Base

        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)

    async def dispose(self) -> None:
        await self.engine.dispose()


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


class JsonDatabase:
    """Small, single-process JSON store with locked, atomic writes."""

    def __init__(self, path: str | Path):
        self.path = Path(path)
        self._lock = threading.RLock()

    def _empty_database(self) -> dict[str, Any]:
        now = utc_now_iso()
        return {
            "metadata": {
                "schema_version": 3,
                "created_at": now,
                "updated_at": now,
            },
            "users": [],
            "sessions": [],
            "behavior_events": [],
            "social": self._empty_social_data(),
        }

    @staticmethod
    def _empty_social_data() -> dict[str, list[dict[str, Any]]]:
        return {
            "posts": [],
            "comments": [],
            "post_likes": [],
            "post_bookmarks": [],
            "comment_likes": [],
            "friend_requests": [],
            "friendships": [],
            "friend_deletion_events": [],
        }

    def _load_unlocked(self) -> dict[str, Any]:
        if not self.path.exists():
            return self._empty_database()

        with self.path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        if not all(key in data for key in ("metadata", "users", "sessions")):
            raise ValueError(f"Uslike JSON 数据库格式无效：{self.path}")
        data.setdefault("behavior_events", [])
        social = data.setdefault("social", {})
        for collection, default in self._empty_social_data().items():
            social.setdefault(collection, default)
        data["metadata"]["schema_version"] = max(data["metadata"].get("schema_version", 1), 3)
        return data

    def _write_unlocked(self, data: dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        data["metadata"]["updated_at"] = utc_now_iso()
        descriptor, temporary_path = tempfile.mkstemp(
            dir=self.path.parent,
            prefix=f".{self.path.name}.",
            suffix=".tmp",
        )
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as file:
                json.dump(data, file, ensure_ascii=False, indent=2)
                file.write("\n")
                file.flush()
                os.fsync(file.fileno())
            os.replace(temporary_path, self.path)
        finally:
            if os.path.exists(temporary_path):
                os.unlink(temporary_path)

    def read(self) -> dict[str, Any]:
        with self._lock:
            return deepcopy(self._load_unlocked())

    def mutate(self, operation: Callable[[dict[str, Any]], T]) -> T:
        with self._lock:
            data = self._load_unlocked()
            result = operation(data)
            self._write_unlocked(data)
            return result
