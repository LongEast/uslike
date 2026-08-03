import os
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Path as ApiPath, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.exceptions import HTTPException as StarletteHTTPException

from .database import JsonDatabase
from .errors import (
    http_exception_handler,
    request_validation_exception_handler,
    unhandled_exception_handler,
)
from .models import (
    AuthResponse,
    LoginRequest,
    OnboardingEventInput,
    OnboardingStateResponse,
    PublicProfile,
    PublicUser,
    RegisterRequest,
    ValuesTestInput,
    ValuesTestResponse,
)
from .security import create_access_token, hash_access_token, hash_password, verify_password


SESSION_TTL = timedelta(days=7)
bearer_scheme = HTTPBearer(auto_error=False)


def utc_now() -> datetime:
    return datetime.now(UTC)


def public_user(user: dict[str, Any]) -> PublicUser:
    profile = user["profile"]
    return PublicUser(
        id=user["id"],
        phone=user["phone"],
        profile=PublicProfile(**profile),
        real_name_verified=user["real_name"]["status"] == "verified",
        onboarding_completed=user["onboarding_completed"],
        created_at=user["created_at"],
        last_login_at=user["last_login_at"],
    )


def create_session(user_id: str, now: datetime) -> tuple[str, dict[str, Any]]:
    raw_token = create_access_token()
    expires_at = now + SESSION_TTL
    return raw_token, {
        "id": str(uuid4()),
        "user_id": user_id,
        "token_hash": hash_access_token(raw_token),
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "revoked_at": None,
    }


def require_token_digest(credentials: HTTPAuthorizationCredentials | None) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
    return hash_access_token(credentials.credentials)


def find_active_session(
    data: dict[str, Any],
    token_digest: str,
    now: datetime,
) -> dict[str, Any] | None:
    return next(
        (
            item
            for item in data["sessions"]
            if item["token_hash"] == token_digest
            and item["revoked_at"] is None
            and datetime.fromisoformat(item["expires_at"]) > now
        ),
        None,
    )


def find_authenticated_user(
    data: dict[str, Any],
    token_digest: str,
    now: datetime,
) -> dict[str, Any] | None:
    session = find_active_session(data, token_digest, now)
    if session is None:
        return None
    return next((item for item in data["users"] if item["id"] == session["user_id"]), None)


def onboarding_response(module: str, state: dict[str, Any] | None) -> OnboardingStateResponse:
    status_value = state.get("status", "not_started") if state else "not_started"
    finished = status_value in {"dismissed", "completed"}
    return OnboardingStateResponse(
        module=module,
        status=status_value,
        finished=finished,
        should_show=not finished,
        current_step=state.get("current_step") if state else None,
    )


def create_app(database_path: str | Path | None = None) -> FastAPI:
    resolved_path = database_path or os.getenv("USLIKE_DATABASE_PATH", "backend/data/uslike.json")
    database = JsonDatabase(resolved_path)
    app = FastAPI(
        title="Uslike MVP API",
        version="0.1.0",
        description=(
            "Uslike MVP 的账号认证服务。使用单实例 JSON 文件存储，"
            "当前仅适合本地开发与产品原型验证。"
        ),
        openapi_tags=[
            {"name": "Authentication", "description": "注册、登录与会话撤销"},
            {"name": "Profile", "description": "登录用户的画像与价值观问卷"},
            {"name": "Onboarding", "description": "按产品模块管理新手引导状态与行为事件"},
        ],
    )
    app.state.database = database
    app.add_exception_handler(RequestValidationError, request_validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.post(
        "/api/auth/register",
        response_model=AuthResponse,
        status_code=status.HTTP_201_CREATED,
        tags=["Authentication"],
        summary="注册并创建登录会话",
        responses={409: {"description": "手机号已注册"}},
    )
    async def register(payload: RegisterRequest) -> AuthResponse:
        now = utc_now()
        user_id = str(uuid4())
        raw_token, session = create_session(user_id, now)
        salt, password_digest = hash_password(payload.password)
        profile = payload.profile.model_dump(mode="json")
        profile["avatar"] = f"https://api.dicebear.com/9.x/thumbs/svg?seed={user_id}"

        user = {
            "id": user_id,
            "phone": payload.phone,
            "auth": {
                "algorithm": "scrypt",
                "salt": salt,
                "password_hash": password_digest,
            },
            "profile": profile,
            "real_name": {"status": "unverified", "verified_at": None},
            "values_test": {
                "version": "v1",
                "presented_question_ids": [],
                "answers": [],
                "completed_at": None,
            },
            "onboarding_completed": True,
            "onboarding_modules": {},
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "last_login_at": now.isoformat(),
        }

        def persist(data: dict[str, Any]) -> None:
            if any(item["phone"] == payload.phone for item in data["users"]):
                raise HTTPException(status_code=409, detail="该手机号已注册")
            data["users"].append(user)
            data["sessions"].append(session)

        database.mutate(persist)
        return AuthResponse(
            access_token=raw_token,
            expires_at=session["expires_at"],
            user=public_user(user),
        )

    @app.get(
        "/api/onboarding/{module}",
        response_model=OnboardingStateResponse,
        tags=["Onboarding"],
        summary="读取指定模块的新手引导状态",
    )
    async def get_onboarding_state(
        module: str = ApiPath(pattern=r"^[a-z0-9_-]{1,50}$"),
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    ) -> OnboardingStateResponse:
        token_digest = require_token_digest(credentials)
        data = database.read()
        user = find_authenticated_user(data, token_digest, utc_now())
        if user is None:
            raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
        return onboarding_response(module, user.get("onboarding_modules", {}).get(module))

    @app.post(
        "/api/onboarding/{module}/events",
        response_model=OnboardingStateResponse,
        tags=["Onboarding"],
        summary="记录模块引导事件并更新是否结束",
    )
    async def record_onboarding_event(
        payload: OnboardingEventInput,
        module: str = ApiPath(pattern=r"^[a-z0-9_-]{1,50}$"),
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    ) -> OnboardingStateResponse:
        token_digest = require_token_digest(credentials)
        now = utc_now()

        def persist(data: dict[str, Any]) -> dict[str, Any]:
            user = find_authenticated_user(data, token_digest, now)
            if user is None:
                raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
            modules = user.setdefault("onboarding_modules", {})
            state = modules.setdefault(
                module,
                {
                    "status": "not_started",
                    "current_step": None,
                    "started_at": None,
                    "ended_at": None,
                    "updated_at": now.isoformat(),
                },
            )
            if state["status"] not in {"dismissed", "completed"}:
                if payload.event == "started":
                    state["status"] = "in_progress"
                    state["started_at"] = state["started_at"] or now.isoformat()
                elif payload.event == "step_viewed":
                    state["status"] = "in_progress"
                    state["current_step"] = payload.step
                elif payload.event in {"dismissed", "completed"}:
                    state["status"] = payload.event
                    state["current_step"] = payload.step
                    state["ended_at"] = now.isoformat()
                state["updated_at"] = now.isoformat()

            data.setdefault("behavior_events", []).append(
                {
                    "id": str(uuid4()),
                    "user_id": user["id"],
                    "module": module,
                    "event": payload.event,
                    "step": payload.step,
                    "occurred_at": now.isoformat(),
                }
            )
            return state

        state = database.mutate(persist)
        return onboarding_response(module, state)

    @app.post(
        "/api/profile/values-test",
        response_model=ValuesTestResponse,
        tags=["Profile"],
        summary="校验并保存当前用户的价值观问卷",
        responses={401: {"description": "Token 无效、已过期或已撤销"}},
    )
    async def save_values_test(
        payload: ValuesTestInput,
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    ) -> ValuesTestResponse:
        token_digest = require_token_digest(credentials)
        now = utc_now()

        def persist(data: dict[str, Any]) -> None:
            session = find_active_session(data, token_digest, now)
            if session is None:
                raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
            user = next((item for item in data["users"] if item["id"] == session["user_id"]), None)
            if user is None:
                raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
            user["values_test"] = {
                **payload.model_dump(mode="json"),
                "completed_at": now.isoformat(),
            }
            user["updated_at"] = now.isoformat()

        database.mutate(persist)
        return ValuesTestResponse(saved_answer_count=len(payload.answers), completed_at=now)

    @app.post(
        "/api/auth/login",
        response_model=AuthResponse,
        tags=["Authentication"],
        summary="使用手机号和密码登录",
        responses={401: {"description": "手机号或密码错误"}},
    )
    async def login(payload: LoginRequest) -> AuthResponse:
        now = utc_now()

        def authenticate(data: dict[str, Any]) -> tuple[str, dict[str, Any], dict[str, Any]]:
            user = next((item for item in data["users"] if item["phone"] == payload.phone), None)
            if user is None or not verify_password(
                payload.password,
                user["auth"]["salt"],
                user["auth"]["password_hash"],
            ):
                raise HTTPException(status_code=401, detail="手机号或密码错误")

            user["last_login_at"] = now.isoformat()
            user["updated_at"] = now.isoformat()
            raw_token, session = create_session(user["id"], now)
            data["sessions"].append(session)
            return raw_token, session, user

        raw_token, session, user = database.mutate(authenticate)
        return AuthResponse(
            access_token=raw_token,
            expires_at=session["expires_at"],
            user=public_user(user),
        )

    @app.post(
        "/api/auth/logout",
        status_code=status.HTTP_204_NO_CONTENT,
        tags=["Authentication"],
        summary="撤销当前登录会话",
        responses={401: {"description": "Token 无效、已过期或已撤销"}},
    )
    async def logout(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    ) -> Response:
        token_digest = require_token_digest(credentials)
        now = utc_now()

        def revoke(data: dict[str, Any]) -> None:
            session = find_active_session(data, token_digest, now)
            if session is None:
                raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
            session["revoked_at"] = now.isoformat()

        database.mutate(revoke)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return app


app = create_app()
