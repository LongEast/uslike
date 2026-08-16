import os
import tempfile
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Path as ApiPath,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .database import DEFAULT_DATABASE_URL, Database
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
from .repository import (
    AccountRepository,
    DuplicatePhoneError,
    IncorrectPasswordError,
    InvalidCredentialsError,
)
from .security import create_access_token, hash_access_token, hash_password


SESSION_TTL = timedelta(days=7)
MAX_AVATAR_BYTES = 2 * 1024 * 1024
FRONTEND_DIST_ENV = "USLIKE_FRONTEND_DIST_PATH"
UPLOADS_PATH_ENV = "USLIKE_UPLOADS_PATH"
DATABASE_URL_ENV = "DATABASE_URL"
CORS_ORIGINS_ENV = "USLIKE_CORS_ORIGINS"
DEFAULT_FRONTEND_DIST_PATH = Path(__file__).resolve().parents[2] / "dist"
DEFAULT_UPLOADS_PATH = Path(__file__).resolve().parents[1] / "data" / "uploads"
DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
)
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


def resolve_frontend_dist_path(
    frontend_dist_path: str | Path | None,
) -> Path | None:
    environment_path = os.getenv(FRONTEND_DIST_ENV)
    if frontend_dist_path is not None:
        configured_path = frontend_dist_path
        source = "create_app(frontend_dist_path=...)"
    elif environment_path is not None:
        configured_path = environment_path
        source = FRONTEND_DIST_ENV
    else:
        configured_path = DEFAULT_FRONTEND_DIST_PATH
        source = None

    if isinstance(configured_path, str) and not configured_path.strip():
        raise RuntimeError(f"Frontend dist path from {source} must not be empty")

    resolved_path = Path(configured_path).expanduser().resolve()
    index_path = resolved_path / "index.html"

    if resolved_path.is_dir() and index_path.is_file():
        resolved_index_path = index_path.resolve()
        try:
            resolved_index_path.relative_to(resolved_path)
        except ValueError as error:
            raise RuntimeError(
                f"Frontend dist index.html from {source or 'the default path'} "
                f"resolves outside the dist directory: {resolved_index_path}"
            ) from error
        return resolved_path
    if source is None:
        # A source checkout may run the API before the frontend has been built.
        return None

    if not resolved_path.exists():
        reason = "does not exist"
    elif not resolved_path.is_dir():
        reason = "is not a directory"
    else:
        reason = "does not contain index.html"
    raise RuntimeError(f"Frontend dist path from {source} {reason}: {resolved_path}")


def create_app(
    database_path: str | Path | None = None,
    *,
    database_url: str | None = None,
    uploads_path: str | Path | None = None,
    frontend_dist_path: str | Path | None = None,
    auto_create_schema: bool | None = None,
) -> FastAPI:
    if database_path is not None and database_url is not None:
        raise RuntimeError("Configure either database_path or database_url, not both")

    resolved_database_path: Path | None = None
    if database_path is not None:
        # Positional paths remain a convenient isolated SQLite hook for tests.
        resolved_database_path = Path(database_path).expanduser().resolve()
        effective_database_url = f"sqlite+aiosqlite:///{resolved_database_path}"
        should_create_schema = True if auto_create_schema is None else auto_create_schema
    else:
        effective_database_url = database_url or os.getenv(DATABASE_URL_ENV, DEFAULT_DATABASE_URL)
        should_create_schema = (
            effective_database_url.startswith(("sqlite://", "sqlite+aiosqlite://"))
            if auto_create_schema is None
            else auto_create_schema
        )

    resolved_frontend_dist_path = resolve_frontend_dist_path(frontend_dist_path)
    configured_uploads_path = uploads_path or os.getenv(UPLOADS_PATH_ENV)
    if isinstance(configured_uploads_path, str) and not configured_uploads_path.strip():
        raise RuntimeError(f"{UPLOADS_PATH_ENV} must not be empty")
    uploads_directory = Path(
        configured_uploads_path
        or (
            resolved_database_path.parent / "uploads"
            if resolved_database_path is not None
            else DEFAULT_UPLOADS_PATH
        )
    ).expanduser().resolve()
    if resolved_frontend_dist_path is not None:
        private_paths: list[tuple[str, Path]] = []
        if resolved_database_path is not None:
            private_paths.append(("database", resolved_database_path))
        private_paths.append(("uploads directory", uploads_directory))
        for private_label, private_path in private_paths:
            try:
                private_path.relative_to(resolved_frontend_dist_path)
            except ValueError:
                continue
            raise RuntimeError(
                f"Frontend dist must not contain the {private_label}: {private_path}"
            )

    database = Database(effective_database_url)
    repository = AccountRepository(database)
    avatar_directory = uploads_directory / "avatars"
    avatar_directory.mkdir(parents=True, exist_ok=True)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if should_create_schema:
            await database.create_schema()
        try:
            yield
        finally:
            await database.dispose()

    app = FastAPI(
        title="Uslike MVP API",
        version="0.2.0",
        description=(
            "Uslike MVP 的账号认证服务。生产数据由 PostgreSQL 持久化，"
            "数据库结构通过 Alembic 版本化。"
        ),
        lifespan=lifespan,
        openapi_tags=[
            {"name": "Authentication", "description": "注册、登录与会话撤销"},
            {"name": "Profile", "description": "登录用户的画像与价值观问卷"},
            {"name": "Account", "description": "当前用户的账号资料与安全设置"},
            {"name": "Onboarding", "description": "按产品模块管理新手引导状态与行为事件"},
        ],
    )
    app.state.database = database
    app.state.repository = repository
    app.state.avatar_directory = avatar_directory
    app.state.uploads_directory = uploads_directory
    app.state.frontend_dist_path = resolved_frontend_dist_path
    app.mount("/api/uploads", StaticFiles(directory=uploads_directory), name="uploads")

    async def frontend_aware_http_exception_handler(
        request: Request,
        error: StarletteHTTPException,
    ) -> Response:
        if (
            resolved_frontend_dist_path is not None
            and error.status_code == status.HTTP_404_NOT_FOUND
            and request.method in {"GET", "HEAD"}
        ):
            frontend_path = request.url.path.lstrip("/")
            first_path_segment = frontend_path.partition("/")[0]
            if first_path_segment not in {"api", "docs", "redoc", "openapi.json"}:
                requested_path = (resolved_frontend_dist_path / frontend_path).resolve()
                try:
                    requested_path.relative_to(resolved_frontend_dist_path)
                except ValueError:
                    pass
                else:
                    if requested_path.is_file():
                        return FileResponse(requested_path)
                    if first_path_segment != "assets":
                        frontend_index_path = (
                            resolved_frontend_dist_path / "index.html"
                        ).resolve()
                        return FileResponse(frontend_index_path, media_type="text/html")

        return await http_exception_handler(request, error)

    app.add_exception_handler(RequestValidationError, request_validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, frontend_aware_http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    cors_value = os.getenv(CORS_ORIGINS_ENV)
    cors_origins = (
        [origin.strip().rstrip("/") for origin in cors_value.split(",") if origin.strip()]
        if cors_value is not None
        else list(DEFAULT_CORS_ORIGINS)
    )
    if cors_value is not None and not cors_origins:
        raise RuntimeError(f"{CORS_ORIGINS_ENV} must contain at least one origin")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health", tags=["Operations"], summary="数据库就绪探针")
    async def health() -> dict[str, str]:
        await database.ping()
        return {"status": "ok", "database": "ok"}

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
        try:
            user = await repository.register(user, session)
        except DuplicatePhoneError as error:
            raise HTTPException(status_code=409, detail="该手机号已注册") from error
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
        user = await repository.authenticated_user(token_digest, utc_now())
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
        try:
            user = await repository.update_profile(
                token_digest,
                now,
                payload.model_dump(mode="json", exclude_unset=True),
            )
        except InvalidCredentialsError as error:
            raise HTTPException(
                status_code=401, detail="无效或已过期的登录凭证"
            ) from error
        return account_response(user)

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
        try:
            user = await repository.update_phone(
                token_digest,
                now,
                payload.new_phone,
                payload.current_password,
            )
        except InvalidCredentialsError as error:
            raise HTTPException(
                status_code=401, detail="无效或已过期的登录凭证"
            ) from error
        except IncorrectPasswordError as error:
            raise HTTPException(status_code=400, detail="当前密码错误") from error
        except DuplicatePhoneError as error:
            raise HTTPException(
                status_code=409, detail="该手机号已被其他账号使用"
            ) from error
        return account_response(user)

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
        try:
            user = await repository.update_password(
                token_digest,
                now,
                payload.current_password,
                payload.new_password,
            )
        except InvalidCredentialsError as error:
            raise HTTPException(
                status_code=401, detail="无效或已过期的登录凭证"
            ) from error
        except IncorrectPasswordError as error:
            raise HTTPException(status_code=400, detail="当前密码错误") from error
        return account_response(user)

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
        current_user = await repository.authenticated_user(token_digest, now)
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
            try:
                updated_user, old_avatar = await repository.set_avatar(
                    token_digest,
                    now,
                    f"/api/uploads/avatars/{filename}",
                )
            except InvalidCredentialsError as error:
                raise HTTPException(
                    status_code=401, detail="无效或已过期的登录凭证"
                ) from error
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
        current_user = await repository.authenticated_user(token_digest, now)
        if current_user is None:
            raise HTTPException(status_code=401, detail="无效或已过期的登录凭证")
        try:
            updated_user, old_avatar = await repository.set_avatar(
                token_digest,
                now,
                default_avatar_url(current_user["id"]),
            )
        except InvalidCredentialsError as error:
            raise HTTPException(
                status_code=401, detail="无效或已过期的登录凭证"
            ) from error
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
        try:
            state = await repository.onboarding_state(token_digest, utc_now(), module)
        except InvalidCredentialsError as error:
            raise HTTPException(
                status_code=401, detail="无效或已过期的登录凭证"
            ) from error
        return onboarding_response(module, state)

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
        try:
            state = await repository.record_onboarding_event(
                token_digest,
                now,
                module,
                payload.event,
                payload.step,
            )
        except InvalidCredentialsError as error:
            raise HTTPException(
                status_code=401, detail="无效或已过期的登录凭证"
            ) from error
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
        try:
            await repository.save_values_test(
                token_digest,
                now,
                payload.model_dump(mode="json"),
            )
        except InvalidCredentialsError as error:
            raise HTTPException(
                status_code=401, detail="无效或已过期的登录凭证"
            ) from error
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
        raw_token = create_access_token()
        session = {
            "id": str(uuid4()),
            "token_hash": hash_access_token(raw_token),
            "created_at": now.isoformat(),
            "expires_at": (now + SESSION_TTL).isoformat(),
            "revoked_at": None,
        }
        try:
            user = await repository.login(payload.phone, payload.password, now, session)
        except InvalidCredentialsError as error:
            raise HTTPException(status_code=401, detail="手机号或密码错误") from error
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
        try:
            await repository.logout(token_digest, now)
        except InvalidCredentialsError as error:
            raise HTTPException(
                status_code=401, detail="无效或已过期的登录凭证"
            ) from error
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return app


app = create_app()
