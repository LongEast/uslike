import copy
import json
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select

import backend.scripts.import_json_database as import_module
from backend.app.database import Database
from backend.app.db_models import BehaviorEvent, OnboardingModule, Session, User
from backend.scripts.import_json_database import (
    DestinationNotEmptyError,
    ImportCountMismatchError,
    LegacyImportError,
    apply_prepared_import,
    load_legacy_json,
    main,
    validate_legacy_document,
)


def _timestamp(offset_seconds=0):
    return (datetime(2026, 1, 1, tzinfo=UTC) + timedelta(seconds=offset_seconds)).isoformat()


def _legacy_document(*, onboarding_modules=None):
    user_id = str(uuid4())
    session_id = str(uuid4())
    event_id = str(uuid4())
    user = {
        "id": user_id,
        "phone": "+8613800138000",
        "auth": {
            "algorithm": "scrypt",
            "salt": "a" * 32,
            "password_hash": "b" * 64,
        },
        "profile": {
            "nickname": "测试用户",
            "age": 25,
            "gender": "神秘",
            "region": "杭州",
            "interests": ["电影"],
            "social_preferences": ["兴趣搭子"],
            "avatar": "https://example.invalid/avatar.svg",
        },
        "real_name": {"status": "unverified", "verified_at": None},
        "values_test": {
            "version": "v1",
            "presented_question_ids": ["question-1"],
            "answers": [
                {"question_id": "question-1", "question": "问题", "answer": "回答"}
            ],
            "completed_at": _timestamp(10),
        },
        "onboarding_completed": True,
        "created_at": _timestamp(),
        "updated_at": _timestamp(20),
        "last_login_at": _timestamp(20),
    }
    if onboarding_modules is not None:
        user["onboarding_modules"] = onboarding_modules
    return {
        "metadata": {
            "schema_version": 3,
            "created_at": _timestamp(),
            "updated_at": _timestamp(30),
        },
        "users": [user],
        "sessions": [
            {
                "id": session_id,
                "user_id": user_id,
                "token_hash": "c" * 64,
                "created_at": _timestamp(20),
                "expires_at": _timestamp(100),
                "revoked_at": None,
            }
        ],
        "behavior_events": [
            {
                "id": event_id,
                "user_id": user_id,
                "module": "meet",
                "event": "started",
                "step": "join_room",
                "occurred_at": _timestamp(21),
            }
        ],
        "social": {
            "posts": [],
            "comments": [],
            "post_likes": [],
            "post_bookmarks": [],
            "comment_likes": [],
            "friend_requests": [],
            "friendships": [],
            "friend_deletion_events": [],
        },
    }


def test_validation_preserves_ids_hashes_sessions_events_and_fills_modules():
    document = _legacy_document()

    prepared = validate_legacy_document(document)

    assert str(prepared.users[0]["id"]) == document["users"][0]["id"]
    assert prepared.users[0]["password_salt"] == "a" * 32
    assert prepared.users[0]["password_hash"] == "b" * 64
    assert str(prepared.sessions[0]["id"]) == document["sessions"][0]["id"]
    assert prepared.sessions[0]["token_hash"] == "c" * 64
    assert str(prepared.behavior_events[0]["id"]) == document["behavior_events"][0]["id"]
    assert prepared.onboarding_modules == ()
    assert prepared.counts.as_dict() == {
        "users": 1,
        "sessions": 1,
        "onboarding_modules": 0,
        "behavior_events": 1,
    }


def test_onboarding_state_is_flattened_with_stable_generated_id():
    state = {
        "status": "completed",
        "current_step": "done",
        "started_at": _timestamp(1),
        "ended_at": _timestamp(2),
        "updated_at": _timestamp(2),
    }
    document = _legacy_document(onboarding_modules={"meet": state})

    first = validate_legacy_document(document)
    second = validate_legacy_document(copy.deepcopy(document))

    assert first.counts.onboarding_modules == 1
    assert first.onboarding_modules[0]["id"] == second.onboarding_modules[0]["id"]
    assert first.onboarding_modules[0]["user_id"] == first.users[0]["id"]
    assert first.onboarding_modules[0]["module"] == "meet"


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda data: data["metadata"].update(schema_version=2), "schema version"),
        (lambda data: data["users"][0].update(id="not-a-uuid"), "valid UUID"),
        (lambda data: data["sessions"][0].update(expires_at="not-a-time"), "ISO 8601"),
        (lambda data: data["sessions"][0].update(user_id=str(uuid4())), "missing user"),
    ],
)
def test_validation_rejects_schema_uuid_time_and_foreign_key_errors(mutate, message):
    document = _legacy_document()
    mutate(document)

    with pytest.raises(LegacyImportError, match=message):
        validate_legacy_document(document)


@pytest.mark.parametrize("duplicate", ["user_id", "phone", "session_id", "token_hash", "event_id"])
def test_validation_rejects_duplicates(duplicate):
    document = _legacy_document()
    if duplicate in {"user_id", "phone"}:
        extra = copy.deepcopy(document["users"][0])
        if duplicate == "user_id":
            extra["phone"] = "+8613900139000"
        else:
            extra["id"] = str(uuid4())
        document["users"].append(extra)
    elif duplicate in {"session_id", "token_hash"}:
        extra = copy.deepcopy(document["sessions"][0])
        if duplicate == "session_id":
            extra["token_hash"] = "d" * 64
        else:
            extra["id"] = str(uuid4())
        document["sessions"].append(extra)
    else:
        document["behavior_events"].append(copy.deepcopy(document["behavior_events"][0]))

    with pytest.raises(LegacyImportError, match="duplicate"):
        validate_legacy_document(document)


def test_nonempty_unsupported_social_data_is_rejected_instead_of_dropped():
    document = _legacy_document()
    document["social"]["posts"].append({"id": str(uuid4())})

    with pytest.raises(LegacyImportError, match="non-empty collection"):
        validate_legacy_document(document)


def test_load_error_and_dry_run_output_do_not_expose_secrets(tmp_path, capsys):
    document = _legacy_document()
    source = tmp_path / "legacy.json"
    source.write_text(json.dumps(document, ensure_ascii=False), encoding="utf-8")

    assert load_legacy_json(source).counts.users == 1
    assert main([str(source)]) == 0
    output = capsys.readouterr()
    combined = output.out + output.err
    assert "dry run" in combined
    assert "a" * 32 not in combined
    assert "b" * 64 not in combined
    assert "c" * 64 not in combined
    assert document["users"][0]["phone"] not in combined


def test_apply_is_explicit_and_requires_database_url(tmp_path, monkeypatch, capsys):
    source = tmp_path / "legacy.json"
    source.write_text(json.dumps(_legacy_document(), ensure_ascii=False), encoding="utf-8")
    monkeypatch.delenv("DATABASE_URL", raising=False)

    assert main([str(source), "--apply"]) == 2
    output = capsys.readouterr()
    assert "DATABASE_URL is required" in output.err
    assert "Import committed" not in output.out


@pytest.mark.anyio
async def test_apply_imports_once_and_verifies_real_sql_counts(tmp_path):
    database = Database(f"sqlite+aiosqlite:///{tmp_path / 'import.db'}")
    await database.create_schema()
    prepared = validate_legacy_document(
        _legacy_document(
            onboarding_modules={
                "meet": {
                    "status": "completed",
                    "current_step": "done",
                    "started_at": _timestamp(1),
                    "ended_at": _timestamp(2),
                    "updated_at": _timestamp(2),
                }
            }
        )
    )
    try:
        counts = await apply_prepared_import(database.session_factory, prepared)
        assert counts == prepared.counts

        async with database.session() as session:
            assert await session.scalar(select(func.count()).select_from(User)) == 1
            assert await session.scalar(select(func.count()).select_from(Session)) == 1
            assert await session.scalar(select(func.count()).select_from(OnboardingModule)) == 1
            assert await session.scalar(select(func.count()).select_from(BehaviorEvent)) == 1
            imported_user = await session.get(User, prepared.users[0]["id"])
            imported_session = await session.get(Session, prepared.sessions[0]["id"])
            assert imported_user.password_hash == prepared.users[0]["password_hash"]
            assert imported_session.token_hash == prepared.sessions[0]["token_hash"]

        with pytest.raises(DestinationNotEmptyError, match="not empty"):
            await apply_prepared_import(database.session_factory, prepared)
    finally:
        await database.dispose()


@pytest.mark.anyio
async def test_count_mismatch_rolls_back_the_whole_transaction(tmp_path, monkeypatch):
    database = Database(f"sqlite+aiosqlite:///{tmp_path / 'rollback.db'}")
    await database.create_schema()
    prepared = validate_legacy_document(_legacy_document())
    original_table_counts = import_module._table_counts
    calls = 0

    async def mismatched_counts(session, model_by_name):
        nonlocal calls
        calls += 1
        counts = await original_table_counts(session, model_by_name)
        if calls == 2:
            counts["users"] += 1
        return counts

    monkeypatch.setattr(import_module, "_table_counts", mismatched_counts)
    try:
        with pytest.raises(ImportCountMismatchError, match="do not match"):
            await apply_prepared_import(database.session_factory, prepared)

        async with database.session() as session:
            assert await original_table_counts(
                session,
                {
                    "users": User,
                    "sessions": Session,
                    "onboarding_modules": OnboardingModule,
                    "behavior_events": BehaviorEvent,
                },
            ) == {
                "users": 0,
                "sessions": 0,
                "onboarding_modules": 0,
                "behavior_events": 0,
            }
    finally:
        await database.dispose()
