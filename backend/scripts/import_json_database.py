"""Validate and import the legacy JSON database into SQLAlchemy.

The command is deliberately a dry run unless ``--apply`` is supplied.  It
prints aggregate counts only: phone numbers, password material, session token
hashes, and profile data are never included in command output or validation
errors.

Usage::

    python -m backend.scripts.import_json_database backend/data/uslike.json
    DATABASE_URL=postgresql://... \
      python -m backend.scripts.import_json_database backend/data/uslike.json --apply
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, NoReturn
from uuid import NAMESPACE_URL, UUID, uuid5


SUPPORTED_SCHEMA_VERSION = 3
PHONE_PATTERN = re.compile(r"^\+?[0-9]{6,20}$")
MODULE_PATTERN = re.compile(r"^[a-z0-9_-]{1,50}$")
SCRYPT_SALT_PATTERN = re.compile(r"^[0-9a-f]{32}$")
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
ONBOARDING_STATUSES = {"not_started", "in_progress", "dismissed", "completed"}
ONBOARDING_EVENTS = {"started", "step_viewed", "dismissed", "completed", "restarted"}
SOCIAL_COLLECTIONS = {
    "posts",
    "comments",
    "post_likes",
    "post_bookmarks",
    "comment_likes",
    "friend_requests",
    "friendships",
    "friend_deletion_events",
}


class LegacyImportError(ValueError):
    """A safe-to-display validation or import precondition error."""


class DestinationNotEmptyError(LegacyImportError):
    """Raised when a one-time import targets tables that already contain rows."""


class ImportCountMismatchError(LegacyImportError):
    """Raised before commit if inserted row counts do not match the source."""


@dataclass(frozen=True)
class ImportCounts:
    users: int
    sessions: int
    onboarding_modules: int
    behavior_events: int

    def as_dict(self) -> dict[str, int]:
        return {
            "users": self.users,
            "sessions": self.sessions,
            "onboarding_modules": self.onboarding_modules,
            "behavior_events": self.behavior_events,
        }

    def summary(self) -> str:
        return ", ".join(f"{name}={count}" for name, count in self.as_dict().items())


@dataclass(frozen=True)
class PreparedImport:
    """Validated rows using the native types expected by the ORM models."""

    users: tuple[dict[str, Any], ...]
    sessions: tuple[dict[str, Any], ...]
    onboarding_modules: tuple[dict[str, Any], ...]
    behavior_events: tuple[dict[str, Any], ...]

    @property
    def counts(self) -> ImportCounts:
        return ImportCounts(
            users=len(self.users),
            sessions=len(self.sessions),
            onboarding_modules=len(self.onboarding_modules),
            behavior_events=len(self.behavior_events),
        )


def _fail(path: str, message: str) -> NoReturn:
    # Never append the rejected value here. Some validated fields are secrets.
    raise LegacyImportError(f"{path}: {message}")


def _mapping(value: object, path: str) -> Mapping[str, Any]:
    if not isinstance(value, dict):
        _fail(path, "expected an object")
    return value


def _list(value: object, path: str) -> list[Any]:
    if not isinstance(value, list):
        _fail(path, "expected an array")
    return value


def _keys(
    value: Mapping[str, Any],
    path: str,
    *,
    required: set[str],
    optional: set[str] | None = None,
) -> None:
    optional = optional or set()
    missing = sorted(required - value.keys())
    if missing:
        _fail(path, f"missing required field(s): {', '.join(missing)}")
    unexpected = sorted(value.keys() - required - optional)
    if unexpected:
        _fail(path, f"unexpected field(s): {', '.join(unexpected)}")


def _string(
    value: object,
    path: str,
    *,
    nullable: bool = False,
    pattern: re.Pattern[str] | None = None,
    max_length: int | None = None,
) -> str | None:
    if value is None and nullable:
        return None
    if not isinstance(value, str) or not value:
        _fail(path, "expected a non-empty string")
    if max_length is not None and len(value) > max_length:
        _fail(path, f"string exceeds maximum length of {max_length}")
    if pattern is not None and pattern.fullmatch(value) is None:
        _fail(path, "string has an invalid format")
    return value


def _boolean(value: object, path: str) -> bool:
    if not isinstance(value, bool):
        _fail(path, "expected a boolean")
    return value


def _integer(value: object, path: str, *, nullable: bool = False) -> int | None:
    if value is None and nullable:
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        _fail(path, "expected an integer")
    return value


def _uuid(value: object, path: str) -> UUID:
    if not isinstance(value, str):
        _fail(path, "expected a UUID string")
    try:
        parsed = UUID(value)
    except (ValueError, AttributeError):
        _fail(path, "expected a valid UUID")
    if str(parsed) != value.lower():
        _fail(path, "expected a canonical UUID")
    return parsed


def _datetime(value: object, path: str, *, nullable: bool = False) -> datetime | None:
    if value is None and nullable:
        return None
    if not isinstance(value, str):
        _fail(path, "expected an ISO 8601 timestamp string")
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        _fail(path, "expected a valid ISO 8601 timestamp")
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        _fail(path, "timestamp must include a UTC offset")
    return parsed


def _string_list(
    value: object,
    path: str,
    *,
    max_items: int | None = None,
    item_max_length: int | None = None,
) -> list[str]:
    items = _list(value, path)
    if max_items is not None and len(items) > max_items:
        _fail(path, f"array exceeds maximum length of {max_items}")
    result: list[str] = []
    for index, item in enumerate(items):
        result.append(
            _string(item, f"{path}[{index}]", max_length=item_max_length) or ""
        )
    return result


def _ensure_unique(values: Sequence[object], path: str, label: str) -> None:
    if len(values) != len(set(values)):
        _fail(path, f"duplicate {label}")


def _validate_metadata(value: object) -> None:
    metadata = _mapping(value, "metadata")
    _keys(
        metadata,
        "metadata",
        required={"schema_version", "created_at", "updated_at"},
    )
    version = _integer(metadata["schema_version"], "metadata.schema_version")
    if version != SUPPORTED_SCHEMA_VERSION:
        _fail(
            "metadata.schema_version",
            f"unsupported schema version (expected {SUPPORTED_SCHEMA_VERSION})",
        )
    created_at = _datetime(metadata["created_at"], "metadata.created_at")
    updated_at = _datetime(metadata["updated_at"], "metadata.updated_at")
    if updated_at < created_at:
        _fail("metadata.updated_at", "timestamp precedes metadata.created_at")


def _validate_profile(value: object, path: str) -> dict[str, Any]:
    profile = _mapping(value, path)
    _keys(
        profile,
        path,
        required={
            "nickname",
            "age",
            "gender",
            "region",
            "interests",
            "social_preferences",
            "avatar",
        },
    )
    age = _integer(profile["age"], f"{path}.age", nullable=True)
    if age is not None and not 1 <= age <= 120:
        _fail(f"{path}.age", "integer must be between 1 and 120")
    gender = _string(profile["gender"], f"{path}.gender", nullable=True)
    if gender is not None and gender not in {"男", "女", "神秘"}:
        _fail(f"{path}.gender", "unsupported value")
    return {
        "nickname": _string(profile["nickname"], f"{path}.nickname", max_length=50),
        "age": age,
        "gender": gender,
        "region": _string(
            profile["region"], f"{path}.region", nullable=True, max_length=100
        ),
        "interests": _string_list(
            profile["interests"],
            f"{path}.interests",
            max_items=30,
            item_max_length=50,
        ),
        "social_preferences": _string_list(
            profile["social_preferences"],
            f"{path}.social_preferences",
            max_items=20,
            item_max_length=50,
        ),
        "avatar_url": _string(profile["avatar"], f"{path}.avatar"),
    }


def _validate_auth(value: object, path: str) -> dict[str, str]:
    auth = _mapping(value, path)
    _keys(auth, path, required={"algorithm", "salt", "password_hash"})
    algorithm = _string(auth["algorithm"], f"{path}.algorithm", max_length=30)
    if algorithm != "scrypt":
        _fail(f"{path}.algorithm", "unsupported password algorithm")
    return {
        "password_algorithm": algorithm,
        "password_salt": _string(
            auth["salt"], f"{path}.salt", pattern=SCRYPT_SALT_PATTERN
        )
        or "",
        "password_hash": _string(
            auth["password_hash"], f"{path}.password_hash", pattern=SHA256_PATTERN
        )
        or "",
    }


def _validate_real_name(value: object, path: str) -> dict[str, Any]:
    real_name = _mapping(value, path)
    _keys(real_name, path, required={"status", "verified_at"})
    status = _string(real_name["status"], f"{path}.status")
    if status not in {"unverified", "pending", "verified", "rejected"}:
        _fail(f"{path}.status", "unsupported value")
    verified_at = _datetime(
        real_name["verified_at"], f"{path}.verified_at", nullable=True
    )
    if status == "verified" and verified_at is None:
        _fail(f"{path}.verified_at", "verified users require a timestamp")
    if status != "verified" and verified_at is not None:
        _fail(f"{path}.verified_at", "only verified users can have a timestamp")
    return {
        "real_name_status": status,
        "real_name_verified_at": verified_at,
    }


def _validate_values_test(value: object, path: str) -> dict[str, Any]:
    values_test = _mapping(value, path)
    _keys(
        values_test,
        path,
        required={"version", "presented_question_ids", "answers", "completed_at"},
    )
    presented = _string_list(
        values_test["presented_question_ids"],
        f"{path}.presented_question_ids",
        max_items=10,
        item_max_length=100,
    )
    _ensure_unique(presented, f"{path}.presented_question_ids", "question id")
    answers: list[dict[str, str]] = []
    answer_ids: list[str] = []
    raw_answers = _list(values_test["answers"], f"{path}.answers")
    if len(raw_answers) > 10:
        _fail(f"{path}.answers", "array exceeds maximum length of 10")
    for index, raw_answer in enumerate(raw_answers):
        answer_path = f"{path}.answers[{index}]"
        answer = _mapping(raw_answer, answer_path)
        _keys(answer, answer_path, required={"question_id", "question", "answer"})
        question_id = (
            _string(
                answer["question_id"],
                f"{answer_path}.question_id",
                max_length=100,
            )
            or ""
        )
        answer_ids.append(question_id)
        answers.append(
            {
                "question_id": question_id,
                "question": _string(
                    answer["question"], f"{answer_path}.question", max_length=500
                )
                or "",
                "answer": _string(
                    answer["answer"], f"{answer_path}.answer", max_length=1000
                )
                or "",
            }
        )
    _ensure_unique(answer_ids, f"{path}.answers", "answered question id")
    if any(question_id not in set(presented) for question_id in answer_ids):
        _fail(f"{path}.answers", "answered question id is not in presented_question_ids")
    return {
        "values_test_version": _string(
            values_test["version"], f"{path}.version", max_length=30
        ),
        "values_test_presented_question_ids": presented,
        "values_test_answers": answers,
        "values_test_completed_at": _datetime(
            values_test["completed_at"], f"{path}.completed_at", nullable=True
        ),
    }


def _validate_onboarding_modules(
    value: object,
    path: str,
    user_id: UUID,
) -> list[dict[str, Any]]:
    modules = _mapping(value, path)
    result: list[dict[str, Any]] = []
    for module, raw_state in modules.items():
        if not isinstance(module, str) or MODULE_PATTERN.fullmatch(module) is None:
            _fail(path, "module name has an invalid format")
        state_path = f"{path}.{module}"
        state = _mapping(raw_state, state_path)
        _keys(
            state,
            state_path,
            required={"status", "current_step", "started_at", "ended_at", "updated_at"},
        )
        status = _string(state["status"], f"{state_path}.status")
        if status not in ONBOARDING_STATUSES:
            _fail(f"{state_path}.status", "unsupported value")
        result.append(
            {
                # Legacy onboarding state had no id. UUIDv5 makes retries deterministic.
                "id": uuid5(NAMESPACE_URL, f"uslike:onboarding:{user_id}:{module}"),
                "user_id": user_id,
                "module": module,
                "status": status,
                "current_step": _string(
                    state["current_step"],
                    f"{state_path}.current_step",
                    nullable=True,
                    max_length=80,
                ),
                "started_at": _datetime(
                    state["started_at"], f"{state_path}.started_at", nullable=True
                ),
                "ended_at": _datetime(
                    state["ended_at"], f"{state_path}.ended_at", nullable=True
                ),
                "updated_at": _datetime(state["updated_at"], f"{state_path}.updated_at"),
            }
        )
    return result


def _validate_user(value: object, index: int) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    path = f"users[{index}]"
    user = _mapping(value, path)
    _keys(
        user,
        path,
        required={
            "id",
            "phone",
            "auth",
            "profile",
            "real_name",
            "values_test",
            "onboarding_completed",
            "created_at",
            "updated_at",
            "last_login_at",
        },
        optional={"onboarding_modules"},
    )
    user_id = _uuid(user["id"], f"{path}.id")
    created_at = _datetime(user["created_at"], f"{path}.created_at")
    updated_at = _datetime(user["updated_at"], f"{path}.updated_at")
    last_login_at = _datetime(user["last_login_at"], f"{path}.last_login_at")
    if updated_at < created_at:
        _fail(f"{path}.updated_at", "timestamp precedes created_at")
    if last_login_at < created_at:
        _fail(f"{path}.last_login_at", "timestamp precedes created_at")

    profile = _validate_profile(user["profile"], f"{path}.profile")
    auth = _validate_auth(user["auth"], f"{path}.auth")
    real_name = _validate_real_name(user["real_name"], f"{path}.real_name")
    values_test = _validate_values_test(user["values_test"], f"{path}.values_test")
    row = {
        "id": user_id,
        "phone": _string(user["phone"], f"{path}.phone", pattern=PHONE_PATTERN),
        **auth,
        **profile,
        **real_name,
        **values_test,
        "onboarding_completed": _boolean(
            user["onboarding_completed"], f"{path}.onboarding_completed"
        ),
        "created_at": created_at,
        "updated_at": updated_at,
        "last_login_at": last_login_at,
    }
    modules = _validate_onboarding_modules(
        user.get("onboarding_modules", {}), f"{path}.onboarding_modules", user_id
    )
    return row, modules


def _validate_session(value: object, index: int) -> dict[str, Any]:
    path = f"sessions[{index}]"
    session = _mapping(value, path)
    _keys(
        session,
        path,
        required={"id", "user_id", "token_hash", "created_at", "expires_at", "revoked_at"},
    )
    created_at = _datetime(session["created_at"], f"{path}.created_at")
    expires_at = _datetime(session["expires_at"], f"{path}.expires_at")
    revoked_at = _datetime(session["revoked_at"], f"{path}.revoked_at", nullable=True)
    if expires_at <= created_at:
        _fail(f"{path}.expires_at", "timestamp must be after created_at")
    if revoked_at is not None and revoked_at < created_at:
        _fail(f"{path}.revoked_at", "timestamp precedes created_at")
    return {
        "id": _uuid(session["id"], f"{path}.id"),
        "user_id": _uuid(session["user_id"], f"{path}.user_id"),
        "token_hash": _string(
            session["token_hash"], f"{path}.token_hash", pattern=SHA256_PATTERN
        ),
        "created_at": created_at,
        "expires_at": expires_at,
        "revoked_at": revoked_at,
    }


def _validate_behavior_event(value: object, index: int) -> dict[str, Any]:
    path = f"behavior_events[{index}]"
    event = _mapping(value, path)
    _keys(
        event,
        path,
        required={"id", "user_id", "module", "event", "step", "occurred_at"},
    )
    event_name = _string(event["event"], f"{path}.event")
    if event_name not in ONBOARDING_EVENTS:
        _fail(f"{path}.event", "unsupported value")
    return {
        "id": _uuid(event["id"], f"{path}.id"),
        "user_id": _uuid(event["user_id"], f"{path}.user_id"),
        "module": _string(event["module"], f"{path}.module", pattern=MODULE_PATTERN),
        "event": event_name,
        "step": _string(
            event["step"], f"{path}.step", nullable=True, max_length=80
        ),
        "occurred_at": _datetime(event["occurred_at"], f"{path}.occurred_at"),
    }


def _validate_social(value: object) -> None:
    social = _mapping(value, "social")
    _keys(social, "social", required=SOCIAL_COLLECTIONS)
    nonempty: list[str] = []
    for name in sorted(SOCIAL_COLLECTIONS):
        if _list(social[name], f"social.{name}"):
            nonempty.append(name)
    if nonempty:
        # The SQL schema currently has no social tables. Failing avoids silent data loss.
        _fail(
            "social",
            "non-empty collection(s) are not supported by this importer: "
            + ", ".join(nonempty),
        )


def validate_legacy_document(document: object) -> PreparedImport:
    """Validate a schema-v3 JSON object and prepare lossless ORM row values."""

    root = _mapping(document, "root")
    _keys(
        root,
        "root",
        required={"metadata", "users", "sessions", "behavior_events", "social"},
    )
    _validate_metadata(root["metadata"])
    _validate_social(root["social"])

    users: list[dict[str, Any]] = []
    onboarding_modules: list[dict[str, Any]] = []
    for index, raw_user in enumerate(_list(root["users"], "users")):
        user, modules = _validate_user(raw_user, index)
        users.append(user)
        onboarding_modules.extend(modules)

    sessions = [
        _validate_session(raw_session, index)
        for index, raw_session in enumerate(_list(root["sessions"], "sessions"))
    ]
    behavior_events = [
        _validate_behavior_event(raw_event, index)
        for index, raw_event in enumerate(
            _list(root["behavior_events"], "behavior_events")
        )
    ]

    user_ids = [row["id"] for row in users]
    user_id_set = set(user_ids)
    _ensure_unique(user_ids, "users", "id")
    _ensure_unique([row["phone"] for row in users], "users", "phone")
    _ensure_unique([row["id"] for row in sessions], "sessions", "id")
    _ensure_unique([row["token_hash"] for row in sessions], "sessions", "token_hash")
    _ensure_unique([row["id"] for row in behavior_events], "behavior_events", "id")
    _ensure_unique(
        [(row["user_id"], row["module"]) for row in onboarding_modules],
        "onboarding_modules",
        "user/module pair",
    )

    if any(row["user_id"] not in user_id_set for row in sessions):
        _fail("sessions", "user_id references a missing user")
    if any(row["user_id"] not in user_id_set for row in behavior_events):
        _fail("behavior_events", "user_id references a missing user")

    return PreparedImport(
        users=tuple(users),
        sessions=tuple(sessions),
        onboarding_modules=tuple(onboarding_modules),
        behavior_events=tuple(behavior_events),
    )


def load_legacy_json(path: str | Path) -> PreparedImport:
    """Read and validate a legacy JSON file without leaking its contents."""

    source = Path(path)
    try:
        with source.open("r", encoding="utf-8") as file:
            document = json.load(file)
    except FileNotFoundError as error:
        raise LegacyImportError("source: JSON file does not exist") from error
    except (OSError, UnicodeError) as error:
        raise LegacyImportError("source: unable to read JSON file") from error
    except json.JSONDecodeError as error:
        raise LegacyImportError(
            f"source: invalid JSON syntax at line {error.lineno}, column {error.colno}"
        ) from error
    return validate_legacy_document(document)


async def _table_counts(session: Any, model_by_name: Mapping[str, type]) -> dict[str, int]:
    from sqlalchemy import func, select

    result: dict[str, int] = {}
    for name, model in model_by_name.items():
        count = await session.scalar(select(func.count()).select_from(model))
        result[name] = int(count or 0)
    return result


async def apply_prepared_import(session_factory: Any, prepared: PreparedImport) -> ImportCounts:
    """Insert all prepared rows and verify counts in one database transaction.

    The target tables must be empty. This makes a retry after a successful import
    fail safely instead of duplicating data, and makes the count comparison exact.
    ``session_factory`` is an SQLAlchemy ``async_sessionmaker`` (kept as ``Any``
    so validation-only users do not need to import SQLAlchemy or a DB driver).
    """

    from backend.app.db_models import BehaviorEvent, OnboardingModule, Session, User

    model_by_name = {
        "users": User,
        "sessions": Session,
        "onboarding_modules": OnboardingModule,
        "behavior_events": BehaviorEvent,
    }
    expected = prepared.counts.as_dict()

    async with session_factory.begin() as session:
        before = await _table_counts(session, model_by_name)
        nonempty = [name for name, count in before.items() if count]
        if nonempty:
            raise DestinationNotEmptyError(
                "destination: target table(s) are not empty: " + ", ".join(nonempty)
            )

        session.add_all(User(**row) for row in prepared.users)
        await session.flush()
        session.add_all(Session(**row) for row in prepared.sessions)
        session.add_all(OnboardingModule(**row) for row in prepared.onboarding_modules)
        session.add_all(BehaviorEvent(**row) for row in prepared.behavior_events)
        await session.flush()

        after = await _table_counts(session, model_by_name)
        if after != expected:
            raise ImportCountMismatchError(
                "destination: inserted row counts do not match the validated source"
            )

    return prepared.counts


async def _apply_from_environment(prepared: PreparedImport) -> ImportCounts:
    database_url = os.getenv("DATABASE_URL")
    if database_url is None or not database_url.strip():
        raise LegacyImportError("configuration: DATABASE_URL is required with --apply")

    from sqlalchemy.engine import make_url

    from backend.app.database import Database

    database = Database(database_url)
    if make_url(database.url).get_backend_name() != "postgresql":
        await database.dispose()
        raise LegacyImportError("configuration: --apply requires a PostgreSQL DATABASE_URL")
    try:
        return await apply_prepared_import(database.session_factory, prepared)
    finally:
        await database.dispose()


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate and optionally import a legacy Uslike JSON database."
    )
    parser.add_argument("source", type=Path, help="path to the legacy schema-v3 JSON file")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="commit the import to PostgreSQL (default: validate-only dry run)",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_argument_parser().parse_args(argv)
    try:
        prepared = load_legacy_json(args.source)
        if not args.apply:
            print(f"Validated legacy JSON (dry run): {prepared.counts.summary()}")
            print("No database changes were made. Re-run with --apply to import.")
            return 0
        counts = asyncio.run(_apply_from_environment(prepared))
        print(f"Import committed: {counts.summary()}")
        return 0
    except LegacyImportError as error:
        print(f"Import aborted: {error}", file=sys.stderr)
        return 2
    except Exception:
        # Driver/SQL errors can contain connection details. Keep CLI output secret-safe.
        print("Import aborted: database operation failed; transaction rolled back", file=sys.stderr)
        return 1


if __name__ == "__main__":  # pragma: no cover - exercised via main() in tests.
    raise SystemExit(main())
