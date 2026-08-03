import os
import tempfile
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI, File, HTTPException, Path as ApiPath, Response, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .database import JsonDatabase
from .errors import (
    http_exception_handler,
    request_validation_exception_handler,
    unhandled_exception_handler,
)
from .models import (
    AccountResponse,
    AuthResponse,
    LoginRequest,
    OnboardingEventInput,
    OnboardingStateResponse,
    PasswordUpdateRequest,
    PhoneUpdateRequest,
    ProfileUpdate,
    PublicProfile,
    PublicUser,
    RegisterRequest,
    ValuesTestInput,
    ValuesTestResponse,
    ValuesTestSummary,
)
from .security import create_access_token, hash_access_token, hash_password, verify_password


SESSION_TTL = timedelta(days=7)
MAX_AVATAR_BYTES = 2 * 1024 * 1024
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


def default_avatar_url(user_id: str) -> str:
    return f"https://api.dicebear.com/9.x/thumbs/svg?seed={user_id}"


def account_response(user: dict[str, Any]) -> AccountResponse:
    values_test = user.get("values_test", {})
    return AccountResponse(
        user=public_user(user),
        values_test=ValuesTestSummary(
            answered_count=len(values_test.get("answers", [])),
            completed_at=values_test.get("completed_at"),
        ),
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
    resolved_path = Path(database_path or os.getenv("USLIKE_DATABASE_PATH", "backend/data/uslike.json"))
    database = JsonDatabase(resolved_path)
    uploads_directory = resolved_path.parent / "uploads"
    avatar_directory = uploads_directory / "avatars"
    avatar_directory.mkdir(parents=True, exist_ok=True)
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
            {"name": "Account", "description": "当前用户的账号资料与安全设置"},
            {"name": "Onboarding", "description": "按产品模块管理新手引导状态与行为事件"},
        ],
    )
    app.state.database = database
    app.state.avatar_directory = avatar_directory
    app.mount("/api/uploads", StaticFiles(directory=uploads_directory), name="uploads")
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
        profile["avatar"] = default_avatar_url(user_id)

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
        "/api/account",
        response_model=AccountResponse,
        tags=["Account"],
        summary="读取当前账号设置资料",
        responses={401: {"description": "Token 无效、已过期或已撤销"}},
    )
    async def get_account(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    ) -> AccountResponse:
        token_digest = require_token_digest(credentials)
        user = find_authenticated_user(database.read(), token_digest, utc_now())
        if user is None:
            raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
        return account_response(user)

    @app.patch(
        "/api/account/profile",
        response_model=AccountResponse,
        tags=["Account"],
        summary="更新当前用户的公开资料",
        responses={401: {"description": "Token 无效、已过期或已撤销"}},
    )
    async def update_account_profile(
        payload: ProfileUpdate,
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    ) -> AccountResponse:
        token_digest = require_token_digest(credentials)
        now = utc_now()

        def persist(data: dict[str, Any]) -> dict[str, Any]:
            user = find_authenticated_user(data, token_digest, now)
            if user is None:
                raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
            user["profile"].update(payload.model_dump(mode="json", exclude_unset=True))
            user["updated_at"] = now.isoformat()
            return user

        return account_response(database.mutate(persist))

    @app.put(
        "/api/account/phone",
        response_model=AccountResponse,
        tags=["Account"],
        summary="验证当前密码并修改登录手机号",
        responses={
            400: {"description": "当前密码错误"},
            401: {"description": "Token 无效、已过期或已撤销"},
            409: {"description": "新手机号已被其他账号使用"},
        },
    )
    async def update_account_phone(
        payload: PhoneUpdateRequest,
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    ) -> AccountResponse:
        token_digest = require_token_digest(credentials)
        now = utc_now()

        def persist(data: dict[str, Any]) -> dict[str, Any]:
            session = find_active_session(data, token_digest, now)
            if session is None:
                raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
            user = next((item for item in data["users"] if item["id"] == session["user_id"]), None)
            if user is None:
                raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
            if not verify_password(payload.current_password, user["auth"]["salt"], user["auth"]["password_hash"]):
                raise HTTPException(status_code=400, detail="当前密码错误")
            if any(item["id"] != user["id"] and item["phone"] == payload.new_phone for item in data["users"]):
                raise HTTPException(status_code=409, detail="该手机号已被其他账号使用")
            user["phone"] = payload.new_phone
            user["updated_at"] = now.isoformat()
            for other_session in data["sessions"]:
                if other_session["user_id"] == user["id"] and other_session["id"] != session["id"] and other_session["revoked_at"] is None:
                    other_session["revoked_at"] = now.isoformat()
            return user

        return account_response(database.mutate(persist))

    @app.put(
        "/api/account/password",
        response_model=AccountResponse,
        tags=["Account"],
        summary="修改密码并撤销其他登录会话",
        responses={
            400: {"description": "当前密码错误"},
            401: {"description": "Token 无效、已过期或已撤销"},
        },
    )
    async def update_account_password(
        payload: PasswordUpdateRequest,
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    ) -> AccountResponse:
        token_digest = require_token_digest(credentials)
        now = utc_now()

        def persist(data: dict[str, Any]) -> dict[str, Any]:
            session = find_active_session(data, token_digest, now)
            if session is None:
                raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
            user = next((item for item in data["users"] if item["id"] == session["user_id"]), None)
            if user is None:
                raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
            if not verify_password(payload.current_password, user["auth"]["salt"], user["auth"]["password_hash"]):
                raise HTTPException(status_code=400, detail="当前密码错误")
            salt, password_digest = hash_password(payload.new_password)
            user["auth"].update({"salt": salt, "password_hash": password_digest})
            user["updated_at"] = now.isoformat()
            for other_session in data["sessions"]:
                if other_session["user_id"] == user["id"] and other_session["id"] != session["id"] and other_session["revoked_at"] is None:
                    other_session["revoked_at"] = now.isoformat()
            return user

        return account_response(database.mutate(persist))

    def uploaded_avatar_path(avatar_url: str | None) -> Path | None:
        prefix = "/api/uploads/avatars/"
        if not avatar_url or not avatar_url.startswith(prefix):
            return None
        candidate = avatar_directory / Path(avatar_url).name
        return candidate if candidate.parent == avatar_directory else None

    @app.post(
        "/api/account/avatar",
        response_model=AccountResponse,
        tags=["Account"],
        summary="上传并替换当前用户头像",
        responses={
            401: {"description": "Token 无效、已过期或已撤销"},
            413: {"description": "头像文件超过 2 MB"},
            415: {"description": "头像格式不受支持或文件内容不匹配"},
        },
    )
    async def upload_account_avatar(
        avatar: UploadFile = File(description="JPEG、PNG 或 WebP 头像，最大 2 MB"),
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    ) -> AccountResponse:
        token_digest = require_token_digest(credentials)
        now = utc_now()
        current_user = find_authenticated_user(database.read(), token_digest, now)
        if current_user is None:
            raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")

        allowed_types = {
            "image/jpeg": ({".jpg", ".jpeg"}, lambda data: data.startswith(b"\xff\xd8\xff"), ".jpg"),
            "image/png": ({".png"}, lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"), ".png"),
            "image/webp": ({".webp"}, lambda data: data.startswith(b"RIFF") and data[8:12] == b"WEBP", ".webp"),
        }
        extension = Path(avatar.filename or "").suffix.lower()
        rule = allowed_types.get(avatar.content_type or "")
        if avatar.size is not None and avatar.size > MAX_AVATAR_BYTES:
            await avatar.close()
            raise HTTPException(status_code=413, detail="头像文件不能超过 2 MB")
        try:
            content = await avatar.read()
        finally:
            await avatar.close()
        if len(content) > MAX_AVATAR_BYTES:
            raise HTTPException(status_code=413, detail="头像文件不能超过 2 MB")
        if rule is None or extension not in rule[0] or not rule[1](content):
            raise HTTPException(status_code=415, detail="头像仅支持内容真实的 JPEG、PNG 或 WebP 文件")

        filename = f"{uuid4()}{rule[2]}"
        final_path = avatar_directory / filename
        descriptor, temporary_path = tempfile.mkstemp(dir=avatar_directory, prefix=".avatar-", suffix=".tmp")
        try:
            with os.fdopen(descriptor, "wb") as file:
                file.write(content)
                file.flush()
                os.fsync(file.fileno())
            os.replace(temporary_path, final_path)
            old_avatar = current_user["profile"].get("avatar")

            def persist(data: dict[str, Any]) -> dict[str, Any]:
                user = find_authenticated_user(data, token_digest, now)
                if user is None:
                    raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
                user["profile"]["avatar"] = f"/api/uploads/avatars/{filename}"
                user["updated_at"] = now.isoformat()
                return user

            updated_user = database.mutate(persist)
        except Exception:
            if final_path.exists():
                final_path.unlink()
            raise
        finally:
            if os.path.exists(temporary_path):
                os.unlink(temporary_path)

        old_path = uploaded_avatar_path(old_avatar)
        if old_path and old_path != final_path and old_path.exists():
            old_path.unlink()
        return account_response(updated_user)

    @app.delete(
        "/api/account/avatar",
        response_model=AccountResponse,
        tags=["Account"],
        summary="恢复当前用户的默认头像",
        responses={401: {"description": "Token 无效、已过期或已撤销"}},
    )
    async def reset_account_avatar(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    ) -> AccountResponse:
        token_digest = require_token_digest(credentials)
        now = utc_now()

        def persist(data: dict[str, Any]) -> tuple[dict[str, Any], str | None]:
            user = find_authenticated_user(data, token_digest, now)
            if user is None:
                raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
            old_avatar = user["profile"].get("avatar")
            user["profile"]["avatar"] = default_avatar_url(user["id"])
            user["updated_at"] = now.isoformat()
            return user, old_avatar

        updated_user, old_avatar = database.mutate(persist)
        old_path = uploaded_avatar_path(old_avatar)
        if old_path and old_path.exists():
            old_path.unlink()
        return account_response(updated_user)

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
            if payload.event == "restarted":
                state["status"] = "in_progress"
                state["current_step"] = payload.step
                state["started_at"] = now.isoformat()
                state["ended_at"] = None
                state["updated_at"] = now.isoformat()
            elif state["status"] not in {"dismissed", "completed"}:
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
