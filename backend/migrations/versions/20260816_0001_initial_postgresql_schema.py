"""Create the initial account, session, and onboarding schema.

Revision ID: 20260816_0001
Revises:
Create Date: 2026-08-16
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260816_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def json_document_type() -> sa.JSON:
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("phone", sa.String(length=21), nullable=False),
        sa.Column(
            "password_algorithm",
            sa.String(length=30),
            server_default=sa.text("'scrypt'"),
            nullable=False,
        ),
        sa.Column("password_salt", sa.String(length=128), nullable=False),
        sa.Column("password_hash", sa.String(length=256), nullable=False),
        sa.Column("nickname", sa.String(length=50), nullable=False),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("gender", sa.String(length=10), nullable=True),
        sa.Column("region", sa.String(length=100), nullable=True),
        sa.Column(
            "interests", json_document_type(), server_default=sa.text("'[]'"), nullable=False
        ),
        sa.Column(
            "social_preferences",
            json_document_type(),
            server_default=sa.text("'[]'"),
            nullable=False,
        ),
        sa.Column("avatar_url", sa.Text(), nullable=False),
        sa.Column(
            "real_name_status",
            sa.String(length=20),
            server_default=sa.text("'unverified'"),
            nullable=False,
        ),
        sa.Column("real_name_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "values_test_version",
            sa.String(length=30),
            server_default=sa.text("'v1'"),
            nullable=False,
        ),
        sa.Column(
            "values_test_presented_question_ids",
            json_document_type(),
            server_default=sa.text("'[]'"),
            nullable=False,
        ),
        sa.Column(
            "values_test_answers",
            json_document_type(),
            server_default=sa.text("'[]'"),
            nullable=False,
        ),
        sa.Column("values_test_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "onboarding_completed", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "last_login_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint("age IS NULL OR age BETWEEN 1 AND 120", name="ck_users_age_range"),
        sa.CheckConstraint(
            "gender IS NULL OR gender IN ('男', '女', '神秘')", name="ck_users_gender_value"
        ),
        sa.CheckConstraint(
            "length(phone) BETWEEN 6 AND 21", name="ck_users_phone_length"
        ),
        sa.CheckConstraint(
            "real_name_status IN ('unverified', 'pending', 'verified', 'rejected')",
            name="ck_users_real_name_status_value",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("phone", name="uq_users_phone"),
    )

    op.create_table(
        "sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "expires_at > created_at", name="ck_sessions_expiry_after_creation"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_sessions_user_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sessions"),
        sa.UniqueConstraint("token_hash", name="uq_sessions_token_hash"),
    )
    op.create_index("ix_sessions_expires_at", "sessions", ["expires_at"], unique=False)
    op.create_index(
        "ix_sessions_user_id_revoked_at", "sessions", ["user_id", "revoked_at"], unique=False
    )

    op.create_table(
        "onboarding_modules",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("module", sa.String(length=50), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'not_started'"),
            nullable=False,
        ),
        sa.Column("current_step", sa.String(length=80), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "length(module) BETWEEN 1 AND 50", name="ck_onboarding_modules_module_length"
        ),
        sa.CheckConstraint(
            "status IN ('not_started', 'in_progress', 'dismissed', 'completed')",
            name="ck_onboarding_modules_status_value",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_onboarding_modules_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_onboarding_modules"),
        sa.UniqueConstraint(
            "user_id", "module", name="uq_onboarding_modules_user_module"
        ),
    )
    op.create_index(
        "ix_onboarding_modules_user_id", "onboarding_modules", ["user_id"], unique=False
    )

    op.create_table(
        "behavior_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("module", sa.String(length=50), nullable=False),
        sa.Column("event", sa.String(length=20), nullable=False),
        sa.Column("step", sa.String(length=80), nullable=True),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "event IN ('started', 'step_viewed', 'dismissed', 'completed', 'restarted')",
            name="ck_behavior_events_event_value",
        ),
        sa.CheckConstraint(
            "length(module) BETWEEN 1 AND 50", name="ck_behavior_events_module_length"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_behavior_events_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_behavior_events"),
    )
    op.create_index(
        "ix_behavior_events_module_occurred_at",
        "behavior_events",
        ["module", "occurred_at"],
        unique=False,
    )
    op.create_index(
        "ix_behavior_events_user_id_occurred_at",
        "behavior_events",
        ["user_id", "occurred_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_behavior_events_user_id_occurred_at", table_name="behavior_events")
    op.drop_index("ix_behavior_events_module_occurred_at", table_name="behavior_events")
    op.drop_table("behavior_events")

    op.drop_index("ix_onboarding_modules_user_id", table_name="onboarding_modules")
    op.drop_table("onboarding_modules")

    op.drop_index("ix_sessions_user_id_revoked_at", table_name="sessions")
    op.drop_index("ix_sessions_expires_at", table_name="sessions")
    op.drop_table("sessions")

    op.drop_table("users")
