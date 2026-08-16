from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    MetaData,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utc_now() -> datetime:
    """Return an aware UTC timestamp for application-side defaults."""

    return datetime.now(UTC)


def json_document_type() -> JSON:
    """Use native JSONB on PostgreSQL while remaining usable with SQLite."""

    return JSON().with_variant(JSONB(), "postgresql")


NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_name)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("length(phone) BETWEEN 6 AND 21", name="phone_length"),
        CheckConstraint("age IS NULL OR age BETWEEN 1 AND 120", name="age_range"),
        CheckConstraint(
            "gender IS NULL OR gender IN ('男', '女', '神秘')",
            name="gender_value",
        ),
        CheckConstraint(
            "real_name_status IN ('unverified', 'pending', 'verified', 'rejected')",
            name="real_name_status_value",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    phone: Mapped[str] = mapped_column(String(21), nullable=False, unique=True)

    password_algorithm: Mapped[str] = mapped_column(
        String(30), nullable=False, default="scrypt", server_default=text("'scrypt'")
    )
    password_salt: Mapped[str] = mapped_column(String(128), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)

    nickname: Mapped[str] = mapped_column(String(50), nullable=False)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    interests: Mapped[list[str]] = mapped_column(
        json_document_type(), nullable=False, default=list, server_default=text("'[]'")
    )
    social_preferences: Mapped[list[str]] = mapped_column(
        json_document_type(), nullable=False, default=list, server_default=text("'[]'")
    )
    avatar_url: Mapped[str] = mapped_column(Text, nullable=False)

    real_name_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="unverified", server_default=text("'unverified'")
    )
    real_name_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    values_test_version: Mapped[str] = mapped_column(
        String(30), nullable=False, default="v1", server_default=text("'v1'")
    )
    values_test_presented_question_ids: Mapped[list[str]] = mapped_column(
        json_document_type(), nullable=False, default=list, server_default=text("'[]'")
    )
    values_test_answers: Mapped[list[dict[str, Any]]] = mapped_column(
        json_document_type(), nullable=False, default=list, server_default=text("'[]'")
    )
    values_test_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    last_login_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=text("CURRENT_TIMESTAMP")
    )

    sessions: Mapped[list[Session]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    onboarding_modules: Mapped[list[OnboardingModule]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    behavior_events: Mapped[list[BehaviorEvent]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        CheckConstraint("expires_at > created_at", name="expiry_after_creation"),
        Index("ix_sessions_user_id_revoked_at", "user_id", "revoked_at"),
        Index("ix_sessions_expires_at", "expires_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=text("CURRENT_TIMESTAMP")
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="sessions")


class OnboardingModule(Base):
    __tablename__ = "onboarding_modules"
    __table_args__ = (
        UniqueConstraint("user_id", "module", name="uq_onboarding_modules_user_module"),
        CheckConstraint("length(module) BETWEEN 1 AND 50", name="module_length"),
        CheckConstraint(
            "status IN ('not_started', 'in_progress', 'dismissed', 'completed')",
            name="status_value",
        ),
        Index("ix_onboarding_modules_user_id", "user_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    module: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="not_started", server_default=text("'not_started'")
    )
    current_step: Mapped[str | None] = mapped_column(String(80), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    user: Mapped[User] = relationship(back_populates="onboarding_modules")


class BehaviorEvent(Base):
    __tablename__ = "behavior_events"
    __table_args__ = (
        CheckConstraint("length(module) BETWEEN 1 AND 50", name="module_length"),
        CheckConstraint(
            "event IN ('started', 'step_viewed', 'dismissed', 'completed', 'restarted')",
            name="event_value",
        ),
        Index("ix_behavior_events_user_id_occurred_at", "user_id", "occurred_at"),
        Index("ix_behavior_events_module_occurred_at", "module", "occurred_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    module: Mapped[str] = mapped_column(String(50), nullable=False)
    event: Mapped[str] = mapped_column(String(20), nullable=False)
    step: Mapped[str | None] = mapped_column(String(80), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=text("CURRENT_TIMESTAMP")
    )

    user: Mapped[User] = relationship(back_populates="behavior_events")
