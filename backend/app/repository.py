from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .database import Database
from .db_models import BehaviorEvent, OnboardingModule, Session, User
from .security import hash_password, verify_password


class RepositoryError(Exception):
    """Base class for expected persistence failures."""


class DuplicatePhoneError(RepositoryError):
    pass


class InvalidCredentialsError(RepositoryError):
    pass


class IncorrectPasswordError(RepositoryError):
    pass


def _uuid(value: str | UUID) -> UUID:
    return value if isinstance(value, UUID) else UUID(value)


def _aware(value: datetime | None) -> datetime | None:
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=UTC)


def _datetime(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    parsed = datetime.fromisoformat(value) if isinstance(value, str) else value
    return _aware(parsed)


def _iso(value: datetime | None) -> str | None:
    normalized = _aware(value)
    return normalized.isoformat() if normalized is not None else None


class AccountRepository:
    """Transactional account/session persistence backed by SQLAlchemy."""

    def __init__(self, database: Database):
        self.database = database

    @staticmethod
    async def _active_session_and_user(
        db: AsyncSession,
        token_digest: str,
        now: datetime,
        *,
        for_update: bool = False,
    ) -> tuple[Session, User] | None:
        statement = (
            select(Session, User)
            .join(User, User.id == Session.user_id)
            .where(
                Session.token_hash == token_digest,
                Session.revoked_at.is_(None),
                Session.expires_at > now,
            )
        )
        if for_update:
            statement = statement.with_for_update()
        row = (await db.execute(statement)).one_or_none()
        return (row[0], row[1]) if row is not None else None

    @staticmethod
    async def _module_map(db: AsyncSession, user_id: UUID) -> dict[str, dict[str, Any]]:
        modules = (
            await db.scalars(
                select(OnboardingModule)
                .where(OnboardingModule.user_id == user_id)
                .order_by(OnboardingModule.module)
            )
        ).all()
        return {
            item.module: {
                "status": item.status,
                "current_step": item.current_step,
                "started_at": _iso(item.started_at),
                "ended_at": _iso(item.ended_at),
                "updated_at": _iso(item.updated_at),
            }
            for item in modules
        }

    @classmethod
    async def _user_dict(cls, db: AsyncSession, user: User) -> dict[str, Any]:
        return {
            "id": str(user.id),
            "phone": user.phone,
            "auth": {
                "algorithm": user.password_algorithm,
                "salt": user.password_salt,
                "password_hash": user.password_hash,
            },
            "profile": {
                "nickname": user.nickname,
                "age": user.age,
                "gender": user.gender,
                "region": user.region,
                "interests": list(user.interests or []),
                "social_preferences": list(user.social_preferences or []),
                "avatar": user.avatar_url,
            },
            "real_name": {
                "status": user.real_name_status,
                "verified_at": _iso(user.real_name_verified_at),
            },
            "values_test": {
                "version": user.values_test_version,
                "presented_question_ids": list(user.values_test_presented_question_ids or []),
                "answers": list(user.values_test_answers or []),
                "completed_at": _iso(user.values_test_completed_at),
            },
            "onboarding_completed": user.onboarding_completed,
            "onboarding_modules": await cls._module_map(db, user.id),
            "created_at": _iso(user.created_at),
            "updated_at": _iso(user.updated_at),
            "last_login_at": _iso(user.last_login_at),
        }

    @staticmethod
    def _new_user(data: dict[str, Any]) -> User:
        auth = data["auth"]
        profile = data["profile"]
        real_name = data["real_name"]
        values_test = data["values_test"]
        return User(
            id=_uuid(data["id"]),
            phone=data["phone"],
            password_algorithm=auth["algorithm"],
            password_salt=auth["salt"],
            password_hash=auth["password_hash"],
            nickname=profile["nickname"],
            age=profile.get("age"),
            gender=profile.get("gender"),
            region=profile.get("region"),
            interests=list(profile.get("interests", [])),
            social_preferences=list(profile.get("social_preferences", [])),
            avatar_url=profile["avatar"],
            real_name_status=real_name["status"],
            real_name_verified_at=_datetime(real_name.get("verified_at")),
            values_test_version=values_test.get("version", "v1"),
            values_test_presented_question_ids=list(
                values_test.get("presented_question_ids", [])
            ),
            values_test_answers=list(values_test.get("answers", [])),
            values_test_completed_at=_datetime(values_test.get("completed_at")),
            onboarding_completed=data.get("onboarding_completed", True),
            created_at=_datetime(data["created_at"]),
            updated_at=_datetime(data["updated_at"]),
            last_login_at=_datetime(data["last_login_at"]),
        )

    @staticmethod
    def _new_session(data: dict[str, Any]) -> Session:
        return Session(
            id=_uuid(data["id"]),
            user_id=_uuid(data["user_id"]),
            token_hash=data["token_hash"],
            created_at=_datetime(data["created_at"]),
            expires_at=_datetime(data["expires_at"]),
            revoked_at=_datetime(data.get("revoked_at")),
        )

    async def register(self, user_data: dict[str, Any], session_data: dict[str, Any]) -> dict[str, Any]:
        try:
            async with self.database.session() as db:
                async with db.begin():
                    if await db.scalar(select(User.id).where(User.phone == user_data["phone"])):
                        raise DuplicatePhoneError
                    user = self._new_user(user_data)
                    db.add_all([user, self._new_session(session_data)])
                    await db.flush()
                    return await self._user_dict(db, user)
        except IntegrityError as error:
            raise DuplicatePhoneError from error

    async def authenticated_user(self, token_digest: str, now: datetime) -> dict[str, Any] | None:
        async with self.database.session() as db:
            row = await self._active_session_and_user(db, token_digest, now)
            return await self._user_dict(db, row[1]) if row else None

    async def update_profile(
        self,
        token_digest: str,
        now: datetime,
        changes: dict[str, Any],
    ) -> dict[str, Any]:
        async with self.database.session() as db:
            async with db.begin():
                row = await self._active_session_and_user(db, token_digest, now, for_update=True)
                if row is None:
                    raise InvalidCredentialsError
                user = row[1]
                field_map = {
                    "nickname": "nickname",
                    "age": "age",
                    "gender": "gender",
                    "region": "region",
                    "interests": "interests",
                    "social_preferences": "social_preferences",
                }
                for source, target in field_map.items():
                    if source in changes:
                        setattr(user, target, changes[source])
                user.updated_at = now
                await db.flush()
                return await self._user_dict(db, user)

    async def update_phone(
        self,
        token_digest: str,
        now: datetime,
        new_phone: str,
        current_password: str,
    ) -> dict[str, Any]:
        try:
            async with self.database.session() as db:
                async with db.begin():
                    row = await self._active_session_and_user(
                        db, token_digest, now, for_update=True
                    )
                    if row is None:
                        raise InvalidCredentialsError
                    current_session, user = row
                    if not verify_password(
                        current_password, user.password_salt, user.password_hash
                    ):
                        raise IncorrectPasswordError
                    if await db.scalar(
                        select(User.id).where(User.phone == new_phone, User.id != user.id)
                    ):
                        raise DuplicatePhoneError
                    user.phone = new_phone
                    user.updated_at = now
                    await db.execute(
                        update(Session)
                        .where(
                            Session.user_id == user.id,
                            Session.id != current_session.id,
                            Session.revoked_at.is_(None),
                        )
                        .values(revoked_at=now)
                    )
                    await db.flush()
                    return await self._user_dict(db, user)
        except IntegrityError as error:
            raise DuplicatePhoneError from error

    async def update_password(
        self,
        token_digest: str,
        now: datetime,
        current_password: str,
        new_password: str,
    ) -> dict[str, Any]:
        async with self.database.session() as db:
            async with db.begin():
                row = await self._active_session_and_user(db, token_digest, now, for_update=True)
                if row is None:
                    raise InvalidCredentialsError
                current_session, user = row
                if not verify_password(current_password, user.password_salt, user.password_hash):
                    raise IncorrectPasswordError
                salt, password_digest = hash_password(new_password)
                user.password_salt = salt
                user.password_hash = password_digest
                user.updated_at = now
                await db.execute(
                    update(Session)
                    .where(
                        Session.user_id == user.id,
                        Session.id != current_session.id,
                        Session.revoked_at.is_(None),
                    )
                    .values(revoked_at=now)
                )
                await db.flush()
                return await self._user_dict(db, user)

    async def set_avatar(
        self,
        token_digest: str,
        now: datetime,
        avatar_url: str,
    ) -> tuple[dict[str, Any], str]:
        async with self.database.session() as db:
            async with db.begin():
                row = await self._active_session_and_user(db, token_digest, now, for_update=True)
                if row is None:
                    raise InvalidCredentialsError
                user = row[1]
                old_avatar = user.avatar_url
                user.avatar_url = avatar_url
                user.updated_at = now
                await db.flush()
                return await self._user_dict(db, user), old_avatar

    async def onboarding_state(
        self, token_digest: str, now: datetime, module: str
    ) -> dict[str, Any] | None:
        async with self.database.session() as db:
            row = await self._active_session_and_user(db, token_digest, now)
            if row is None:
                raise InvalidCredentialsError
            item = await db.scalar(
                select(OnboardingModule).where(
                    OnboardingModule.user_id == row[1].id,
                    OnboardingModule.module == module,
                )
            )
            if item is None:
                return None
            return {
                "status": item.status,
                "current_step": item.current_step,
                "started_at": _iso(item.started_at),
                "ended_at": _iso(item.ended_at),
                "updated_at": _iso(item.updated_at),
            }

    async def record_onboarding_event(
        self,
        token_digest: str,
        now: datetime,
        module: str,
        event: str,
        step: str | None,
    ) -> dict[str, Any]:
        async with self.database.session() as db:
            async with db.begin():
                row = await self._active_session_and_user(db, token_digest, now, for_update=True)
                if row is None:
                    raise InvalidCredentialsError
                user = row[1]
                state = await db.scalar(
                    select(OnboardingModule)
                    .where(
                        OnboardingModule.user_id == user.id,
                        OnboardingModule.module == module,
                    )
                    .with_for_update()
                )
                if state is None:
                    state = OnboardingModule(
                        user_id=user.id,
                        module=module,
                        status="not_started",
                        updated_at=now,
                    )
                    db.add(state)
                if event == "restarted":
                    state.status = "in_progress"
                    state.current_step = step
                    state.started_at = now
                    state.ended_at = None
                    state.updated_at = now
                elif state.status not in {"dismissed", "completed"}:
                    if event == "started":
                        state.status = "in_progress"
                        state.started_at = state.started_at or now
                    elif event == "step_viewed":
                        state.status = "in_progress"
                        state.current_step = step
                    elif event in {"dismissed", "completed"}:
                        state.status = event
                        state.current_step = step
                        state.ended_at = now
                    state.updated_at = now
                db.add(
                    BehaviorEvent(
                        user_id=user.id,
                        module=module,
                        event=event,
                        step=step,
                        occurred_at=now,
                    )
                )
                await db.flush()
                return {
                    "status": state.status,
                    "current_step": state.current_step,
                    "started_at": _iso(state.started_at),
                    "ended_at": _iso(state.ended_at),
                    "updated_at": _iso(state.updated_at),
                }

    async def save_values_test(
        self,
        token_digest: str,
        now: datetime,
        values_test: dict[str, Any],
    ) -> None:
        async with self.database.session() as db:
            async with db.begin():
                row = await self._active_session_and_user(db, token_digest, now, for_update=True)
                if row is None:
                    raise InvalidCredentialsError
                user = row[1]
                user.values_test_version = values_test["version"]
                user.values_test_presented_question_ids = list(
                    values_test["presented_question_ids"]
                )
                user.values_test_answers = list(values_test["answers"])
                user.values_test_completed_at = now
                user.updated_at = now

    async def login(
        self,
        phone: str,
        password: str,
        now: datetime,
        session_data: dict[str, Any],
    ) -> dict[str, Any]:
        async with self.database.session() as db:
            async with db.begin():
                user = await db.scalar(select(User).where(User.phone == phone).with_for_update())
                if user is None or not verify_password(
                    password, user.password_salt, user.password_hash
                ):
                    raise InvalidCredentialsError
                user.last_login_at = now
                user.updated_at = now
                db.add(self._new_session({**session_data, "user_id": str(user.id)}))
                await db.flush()
                return await self._user_dict(db, user)

    async def logout(self, token_digest: str, now: datetime) -> None:
        async with self.database.session() as db:
            async with db.begin():
                row = await self._active_session_and_user(db, token_digest, now, for_update=True)
                if row is None:
                    raise InvalidCredentialsError
                row[0].revoked_at = now

    async def snapshot(self) -> dict[str, Any]:
        """Return a redaction-free legacy-shaped snapshot for migration tests/backups."""

        async with self.database.session() as db:
            users = (await db.scalars(select(User).order_by(User.created_at, User.id))).all()
            sessions = (await db.scalars(select(Session).order_by(Session.created_at, Session.id))).all()
            events = (
                await db.scalars(select(BehaviorEvent).order_by(BehaviorEvent.occurred_at, BehaviorEvent.id))
            ).all()
            return {
                "metadata": {"schema_version": 4},
                "users": [await self._user_dict(db, user) for user in users],
                "sessions": [
                    {
                        "id": str(item.id),
                        "user_id": str(item.user_id),
                        "token_hash": item.token_hash,
                        "created_at": _iso(item.created_at),
                        "expires_at": _iso(item.expires_at),
                        "revoked_at": _iso(item.revoked_at),
                    }
                    for item in sessions
                ],
                "behavior_events": [
                    {
                        "id": str(item.id),
                        "user_id": str(item.user_id),
                        "module": item.module,
                        "event": item.event,
                        "step": item.step,
                        "occurred_at": _iso(item.occurred_at),
                    }
                    for item in events
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
