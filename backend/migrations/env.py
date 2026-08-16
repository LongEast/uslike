from __future__ import annotations

import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection, URL, make_url
from sqlalchemy.ext.asyncio import create_async_engine

from backend.app.db_models import Base


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def normalize_database_url(raw_url: str) -> URL:
    """Return an async SQLAlchemy URL suitable for Alembic's async engine."""

    url = make_url(raw_url.strip())
    driver = url.drivername.lower()
    if driver in {"postgres", "postgresql"} or driver.startswith(
        ("postgres+", "postgresql+")
    ):
        return url.set(drivername="postgresql+asyncpg")
    if driver in {"sqlite", "sqlite+pysqlite"}:
        return url.set(drivername="sqlite+aiosqlite")
    return url


def database_url() -> URL:
    raw_url = os.getenv("DATABASE_URL")
    if raw_url is None or not raw_url.strip():
        raise RuntimeError("DATABASE_URL must be set before running Alembic")
    return normalize_database_url(raw_url)


def run_migrations_offline() -> None:
    url = database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        render_as_batch=url.get_backend_name() == "sqlite",
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        render_as_batch=connection.dialect.name == "sqlite",
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(database_url(), poolclass=pool.NullPool)

    try:
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
    finally:
        await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
