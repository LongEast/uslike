import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


PHONE_PATTERN = re.compile(r"^\+?[0-9]{6,20}$")


class ApiModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class ProfileInput(ApiModel):
    nickname: Annotated[
        str,
        Field(min_length=1, max_length=50, description="公开昵称", examples=["小橘"]),
    ]
    age: int | None = Field(default=None, ge=1, le=120, description="年龄，可选")
    gender: Literal["男", "女", "神秘"] | None = Field(default=None, description="展示性别，可选")
    region: str | None = Field(default=None, max_length=100, description="所在地域，可选")
    interests: list[Annotated[str, Field(min_length=1, max_length=50)]] = Field(
        default_factory=list,
        max_length=30,
        description="兴趣标签",
    )
    social_preferences: list[Annotated[str, Field(min_length=1, max_length=50)]] = Field(
        default_factory=list,
        max_length=20,
        description="社交偏好",
    )

    @field_validator("region", mode="before")
    @classmethod
    def empty_region_to_none(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("interests", "social_preferences")
    @classmethod
    def unique_labels(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(values))


class ValueAnswerInput(ApiModel):
    question_id: Annotated[str, Field(min_length=1, max_length=100, description="稳定的题库 ID")]
    question: Annotated[str, Field(min_length=1, max_length=500, description="注册时展示的题目文本")]
    answer: Annotated[str, Field(min_length=1, max_length=1000, description="用户答案")]


class ValuesTestInput(ApiModel):
    version: str = Field(default="v1", max_length=30, description="题库版本")
    presented_question_ids: list[Annotated[str, Field(min_length=1, max_length=100)]] = Field(
        default_factory=list,
        max_length=10,
        description="本次随机展示的题目 ID，最多 10 道",
    )
    answers: list[ValueAnswerInput] = Field(
        default_factory=list,
        max_length=10,
        description="实际作答内容；允许部分回答或跳过",
    )

    @field_validator("presented_question_ids")
    @classmethod
    def unique_question_ids(cls, values: list[str]) -> list[str]:
        if len(values) != len(set(values)):
            raise ValueError("展示题目 ID 不能重复")
        return values

    @model_validator(mode="after")
    def answers_match_presented_questions(self) -> "ValuesTestInput":
        answer_ids = [answer.question_id for answer in self.answers]
        if len(answer_ids) != len(set(answer_ids)):
            raise ValueError("同一道题不能重复提交答案")
        if any(question_id not in self.presented_question_ids for question_id in answer_ids):
            raise ValueError("答案中的题目 ID 必须存在于本次展示的题目中")
        return self


class Credentials(ApiModel):
    phone: str = Field(description="手机号，可包含一个开头的 +", examples=["+8613800138000"])
    password: Annotated[
        str,
        Field(min_length=8, max_length=128, description="至少 8 位密码", examples=["correct-horse"]),
    ]

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        normalized = value.replace(" ", "").replace("-", "")
        if not PHONE_PATTERN.fullmatch(normalized):
            raise ValueError("手机号必须包含 6 到 20 位数字，并且只能在开头使用 +")
        return normalized


class RegisterRequest(Credentials):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "phone": "+8613800138000",
                    "password": "correct-horse",
                    "profile": {
                        "nickname": "小橘",
                        "age": 25,
                        "gender": "神秘",
                        "region": "杭州",
                        "interests": ["电影", "旅行"],
                        "social_preferences": ["认识朋友", "兴趣搭子"],
                    },
                }
            ]
        }
    )
    profile: ProfileInput


class LoginRequest(Credentials):
    pass


class PublicProfile(ProfileInput):
    avatar: str


class PublicUser(ApiModel):
    id: str
    phone: str
    profile: PublicProfile
    real_name_verified: bool = Field(description="仅公开是否已实名，不公开实名资料")
    onboarding_completed: bool
    created_at: datetime
    last_login_at: datetime


class ValuesTestSummary(ApiModel):
    answered_count: int = Field(description="已保存的问卷答案数量")
    completed_at: datetime | None = Field(default=None, description="最近一次问卷提交时间")


class AccountResponse(ApiModel):
    user: PublicUser
    values_test: ValuesTestSummary


class ProfileUpdate(ApiModel):
    nickname: Annotated[str, Field(min_length=1, max_length=50)] | None = None
    age: int | None = Field(default=None, ge=1, le=120)
    gender: Literal["男", "女", "神秘"] | None = None
    region: str | None = Field(default=None, max_length=100)
    interests: list[Annotated[str, Field(min_length=1, max_length=50)]] | None = Field(
        default=None,
        max_length=30,
    )
    social_preferences: list[Annotated[str, Field(min_length=1, max_length=50)]] | None = Field(
        default=None,
        max_length=20,
    )

    @field_validator("region", mode="before")
    @classmethod
    def empty_region_to_none(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("interests", "social_preferences")
    @classmethod
    def unique_optional_labels(cls, values: list[str] | None) -> list[str] | None:
        return list(dict.fromkeys(values)) if values is not None else None

    @model_validator(mode="after")
    def has_editable_field(self) -> "ProfileUpdate":
        if not self.model_fields_set:
            raise ValueError("至少需要提交一个要修改的字段")
        if "nickname" in self.model_fields_set and self.nickname is None:
            raise ValueError("昵称不能为空")
        return self


class PhoneUpdateRequest(ApiModel):
    new_phone: str = Field(description="新的登录手机号", examples=["+8613900139000"])
    current_password: Annotated[str, Field(min_length=8, max_length=128)]

    @field_validator("new_phone")
    @classmethod
    def normalize_new_phone(cls, value: str) -> str:
        normalized = value.replace(" ", "").replace("-", "")
        if not PHONE_PATTERN.fullmatch(normalized):
            raise ValueError("手机号必须包含 6 到 20 位数字，并且只能在开头使用 +")
        return normalized


class PasswordUpdateRequest(ApiModel):
    current_password: Annotated[str, Field(min_length=8, max_length=128)]
    new_password: Annotated[str, Field(min_length=8, max_length=128)]

    @model_validator(mode="after")
    def password_must_change(self) -> "PasswordUpdateRequest":
        if self.current_password == self.new_password:
            raise ValueError("新密码不能与当前密码相同")
        return self


class AuthResponse(ApiModel):
    access_token: str = Field(
        description="随机 Bearer Token，仅在创建会话时返回",
        examples=["R7f_example_random_session_token"],
    )
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
    user: PublicUser


class ValuesTestResponse(ApiModel):
    saved_answer_count: int = Field(description="本次保存的答案数量")
    completed_at: datetime = Field(description="问卷保存时间")


class OnboardingEventInput(ApiModel):
    event: Literal["started", "step_viewed", "dismissed", "completed", "restarted"]
    step: str | None = Field(default=None, min_length=1, max_length=80)


class OnboardingStateResponse(ApiModel):
    module: str
    status: Literal["not_started", "in_progress", "dismissed", "completed"]
    finished: bool
    should_show: bool
    current_step: str | None = None
