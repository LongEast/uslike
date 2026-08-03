import json
from datetime import UTC, datetime, timedelta

import httpx
import pytest

from backend.app.main import create_app


@pytest.fixture
def database_path(tmp_path):
    return tmp_path / "uslike-test.json"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client(database_path):
    app = create_app(database_path)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as test_client:
        test_client.app = app
        yield test_client


def register_payload(phone="+8613800138000", password="correct-horse"):
    return {
        "phone": phone,
        "password": password,
        "profile": {
            "nickname": "小橘",
            "age": 25,
            "gender": "神秘",
            "region": "杭州",
            "interests": ["电影", "旅行", "电影"],
            "social_preferences": ["认识朋友", "兴趣搭子"],
        },
    }


def values_test_payload():
    return {
        "version": "v1",
        "presented_question_ids": ["values-family-public", "play-private-room"],
        "answers": [
            {
                "question_id": "values-family-public",
                "question": "家人在公开场合发表了错误观点，你会？",
                "answer": "之后私下沟通",
            }
        ],
    }


@pytest.mark.anyio
async def test_register_persists_complete_private_metadata(client, database_path):
    response = await client.post("/api/auth/register", json=register_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["profile"]["nickname"] == "小橘"
    assert body["user"]["profile"]["interests"] == ["电影", "旅行"]
    assert body["user"]["real_name_verified"] is False
    assert "auth" not in body["user"]
    assert "values_test" not in body["user"]

    persisted_text = database_path.read_text(encoding="utf-8")
    persisted = json.loads(persisted_text)
    assert persisted["metadata"]["schema_version"] == 2
    assert persisted["users"][0]["real_name"] == {"status": "unverified", "verified_at": None}
    assert persisted["users"][0]["values_test"]["answers"] == []
    assert persisted["users"][0]["values_test"]["completed_at"] is None
    assert persisted["users"][0]["auth"]["algorithm"] == "scrypt"
    assert "correct-horse" not in persisted_text
    assert persisted["sessions"][0]["token_hash"] != body["access_token"]


@pytest.mark.anyio
async def test_register_accepts_optional_profile_without_questionnaire(client):
    payload = register_payload()
    payload["profile"] = {"nickname": "只填昵称"}

    response = await client.post("/api/auth/register", json=payload)

    assert response.status_code == 201
    profile = response.json()["user"]["profile"]
    assert profile["age"] is None
    assert profile["interests"] == []
    assert profile["social_preferences"] == []

    coupled_payload = register_payload(phone="+8613900139000")
    coupled_payload["values_test"] = values_test_payload()
    coupled_response = await client.post("/api/auth/register", json=coupled_payload)
    assert coupled_response.status_code == 422
    assert coupled_response.json()["detail"][0]["msg"] == "价值观测试不是支持的字段"


@pytest.mark.anyio
async def test_duplicate_phone_and_invalid_request_errors(client):
    assert (await client.post("/api/auth/register", json=register_payload())).status_code == 201
    assert (await client.post("/api/auth/register", json=register_payload())).status_code == 409

    invalid = register_payload(phone="not-a-phone", password="short")
    invalid_response = await client.post("/api/auth/register", json=invalid)
    assert invalid_response.status_code == 422
    messages = [item["msg"] for item in invalid_response.json()["detail"]]
    assert "手机号必须包含 6 到 20 位数字，并且只能在开头使用 +" in messages
    assert "密码长度不能少于 8 个字符" in messages


@pytest.mark.anyio
async def test_validation_and_framework_errors_are_localized(client):
    missing_phone = register_payload()
    del missing_phone["phone"]
    missing_response = await client.post("/api/auth/register", json=missing_phone)
    assert missing_response.json()["detail"][0]["msg"] == "手机号为必填项"

    invalid_profile = register_payload()
    invalid_profile["profile"]["age"] = "不是数字"
    invalid_profile["profile"]["gender"] = "其他"
    profile_response = await client.post("/api/auth/register", json=invalid_profile)
    profile_messages = [item["msg"] for item in profile_response.json()["detail"]]
    assert "年龄必须是整数" in profile_messages
    assert "性别不是允许的选项" in profile_messages

    registration = (await client.post("/api/auth/register", json=register_payload())).json()
    duplicate_questions = values_test_payload()
    duplicate_questions["presented_question_ids"] = ["same", "same"]
    duplicate_response = await client.post(
        "/api/profile/values-test",
        json=duplicate_questions,
        headers={"Authorization": f"Bearer {registration['access_token']}"},
    )
    assert duplicate_response.json()["detail"][0]["msg"] == "展示题目 ID 不能重复"

    malformed_json = await client.post(
        "/api/auth/register",
        content="{not-json}",
        headers={"Content-Type": "application/json"},
    )
    assert malformed_json.json()["detail"][0]["msg"] == "请求内容不是有效的 JSON"

    not_found = await client.get("/api/does-not-exist")
    assert not_found.status_code == 404
    assert not_found.json()["detail"] == "请求的接口不存在"

    method_not_allowed = await client.get("/api/auth/login")
    assert method_not_allowed.status_code == 405
    assert method_not_allowed.json()["detail"] == "该接口不支持当前请求方法"


@pytest.mark.anyio
async def test_values_test_requires_authentication_and_persists_answers(client, database_path):
    payload = values_test_payload()
    unauthorized = await client.post("/api/profile/values-test", json=payload)
    assert unauthorized.status_code == 401

    registration = (await client.post("/api/auth/register", json=register_payload())).json()
    response = await client.post(
        "/api/profile/values-test",
        json=payload,
        headers={"Authorization": f"Bearer {registration['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json()["saved_answer_count"] == 1
    persisted = json.loads(database_path.read_text(encoding="utf-8"))
    saved_test = persisted["users"][0]["values_test"]
    assert saved_test["answers"][0]["question_id"] == "values-family-public"
    assert saved_test["completed_at"] is not None


@pytest.mark.anyio
async def test_values_test_rejects_answers_for_questions_not_presented(client):
    registration = (await client.post("/api/auth/register", json=register_payload())).json()
    payload = values_test_payload()
    payload["answers"][0]["question_id"] = "unknown-question"
    response = await client.post(
        "/api/profile/values-test",
        json=payload,
        headers={"Authorization": f"Bearer {registration['access_token']}"},
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "答案中的题目 ID 必须存在于本次展示的题目中"


@pytest.mark.anyio
async def test_module_onboarding_restarts_until_dismissed_or_completed(client, database_path):
    registration = (await client.post("/api/auth/register", json=register_payload())).json()
    headers = {"Authorization": f"Bearer {registration['access_token']}"}

    initial = await client.get("/api/onboarding/meet", headers=headers)
    assert initial.json() == {
        "module": "meet",
        "status": "not_started",
        "finished": False,
        "should_show": True,
        "current_step": None,
    }

    started = await client.post(
        "/api/onboarding/meet/events",
        json={"event": "started", "step": "join_room"},
        headers=headers,
    )
    assert started.json()["finished"] is False
    assert (await client.get("/api/onboarding/meet", headers=headers)).json()["should_show"] is True

    completed = await client.post(
        "/api/onboarding/meet/events",
        json={"event": "completed", "step": "open_messages"},
        headers=headers,
    )
    assert completed.json()["status"] == "completed"
    assert completed.json()["finished"] is True
    assert (await client.get("/api/onboarding/meet", headers=headers)).json()["should_show"] is False

    persisted = json.loads(database_path.read_text(encoding="utf-8"))
    assert persisted["users"][0]["onboarding_modules"]["meet"]["status"] == "completed"
    assert [event["event"] for event in persisted["behavior_events"]] == ["started", "completed"]


@pytest.mark.anyio
async def test_dismissed_module_onboarding_is_terminal(client):
    registration = (await client.post("/api/auth/register", json=register_payload())).json()
    headers = {"Authorization": f"Bearer {registration['access_token']}"}
    dismissed = await client.post(
        "/api/onboarding/meet/events",
        json={"event": "dismissed", "step": "chat_reply"},
        headers=headers,
    )
    assert dismissed.json()["status"] == "dismissed"
    assert dismissed.json()["should_show"] is False


@pytest.mark.anyio
async def test_login_uses_same_error_for_unknown_phone_and_wrong_password(client):
    await client.post("/api/auth/register", json=register_payload())

    success = await client.post(
        "/api/auth/login",
        json={"phone": "+86 138-0013-8000", "password": "correct-horse"},
    )
    wrong_password = await client.post(
        "/api/auth/login",
        json={"phone": "+8613800138000", "password": "wrong-password"},
    )
    unknown_phone = await client.post(
        "/api/auth/login",
        json={"phone": "+8613900139000", "password": "wrong-password"},
    )

    assert success.status_code == 200
    assert wrong_password.status_code == unknown_phone.status_code == 401
    assert wrong_password.json()["detail"] == unknown_phone.json()["detail"]
    expires_at = datetime.fromisoformat(success.json()["expires_at"])
    assert timedelta(days=6, hours=23) < expires_at - datetime.now(UTC) <= timedelta(days=7)


@pytest.mark.anyio
async def test_logout_revokes_session_and_rejects_reuse(client, database_path):
    registration = (await client.post("/api/auth/register", json=register_payload())).json()
    headers = {"Authorization": f"Bearer {registration['access_token']}"}

    assert (await client.post("/api/auth/logout", headers=headers)).status_code == 204
    assert (await client.post("/api/auth/logout", headers=headers)).status_code == 401
    persisted = json.loads(database_path.read_text(encoding="utf-8"))
    assert persisted["sessions"][0]["revoked_at"] is not None
    assert (await client.post("/api/auth/logout")).status_code == 401


@pytest.mark.anyio
async def test_logout_rejects_expired_session(client, database_path):
    registration = (await client.post("/api/auth/register", json=register_payload())).json()
    database = client.app.state.database

    def expire(data):
        data["sessions"][0]["expires_at"] = (datetime.now(UTC) - timedelta(seconds=1)).isoformat()

    database.mutate(expire)
    headers = {"Authorization": f"Bearer {registration['access_token']}"}
    assert (await client.post("/api/auth/logout", headers=headers)).status_code == 401


@pytest.mark.anyio
async def test_openapi_documents_auth_and_values_test_operations(client):
    schema = (await client.get("/openapi.json")).json()
    auth_paths = {path for path in schema["paths"] if path.startswith("/api/auth/")}
    assert auth_paths == {"/api/auth/register", "/api/auth/login", "/api/auth/logout"}
    assert "/api/profile/values-test" in schema["paths"]
    assert "/api/onboarding/{module}" in schema["paths"]
    assert "/api/onboarding/{module}/events" in schema["paths"]
