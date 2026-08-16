from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import Field, field_validator, model_validator

from .models import ApiModel


RelationshipStatus = Literal[
    "self",
    "none",
    "friends",
    "incoming_pending",
    "outgoing_pending",
]


class PublicUserSummary(ApiModel):
    user_id: str
    nickname: str
    avatar: str
    region: str | None = None
    relationship_status: RelationshipStatus
    pending_request_id: str | None = None


class PublicUserDetail(PublicUserSummary):
    age: int | None = None
    gender: Literal["男", "女", "神秘"] | None = None
    interests: list[str] = Field(default_factory=list)
    post_count: int = 0


class SuggestedUser(PublicUserDetail):
    map_x: float
    map_y: float


class PostImage(ApiModel):
    image_id: str
    url: str
    content_type: str


class ReplyReference(ApiModel):
    comment_id: str
    author: PublicUserSummary | None = None
    content_excerpt: str | None = None
    deleted: bool


class CommentResponse(ApiModel):
    comment_id: str
    post_id: str
    root_comment_id: str
    author: PublicUserSummary | None = None
    content: str | None = None
    deleted: bool
    created_at: datetime
    deleted_at: datetime | None = None
    reply_to: ReplyReference | None = None
    like_count: int
    is_liked: bool
    can_delete: bool


class RootCommentResponse(CommentResponse):
    reply_count: int
    replies_preview: list[CommentResponse] = Field(default_factory=list, max_length=2)
    has_more_replies: bool


class PostResponse(ApiModel):
    post_id: str
    author: PublicUserSummary
    content: str | None = None
    tags: list[str] = Field(default_factory=list)
    images: list[PostImage] = Field(default_factory=list, max_length=9)
    link_url: str | None = None
    created_at: datetime
    like_count: int
    comment_count: int
    is_liked: bool
    is_bookmarked: bool
    can_delete: bool
    comments_preview: list[RootCommentResponse] = Field(default_factory=list, max_length=2)
    has_more_comments: bool


class PageMeta(ApiModel):
    count: int


class PostPage(ApiModel):
    items: list[PostResponse]
    next_cursor: str | None = None
    meta: PageMeta


class CommentPage(ApiModel):
    items: list[RootCommentResponse]
    next_cursor: str | None = None
    meta: PageMeta


class ReplyPage(ApiModel):
    items: list[CommentResponse]
    next_cursor: str | None = None
    meta: PageMeta


class CommentCreate(ApiModel):
    content: Annotated[str, Field(min_length=1, max_length=1000)]
    reply_to_comment_id: str | None = Field(default=None, min_length=1, max_length=100)


class CommentContextResponse(ApiModel):
    comment: CommentResponse
    root_comment: RootCommentResponse


class LikeResponse(ApiModel):
    liked: bool
    like_count: int


class BookmarkResponse(ApiModel):
    bookmarked: bool


class FriendQuota(ApiModel):
    limit: int
    used: int
    remaining: int


class FriendDeletionQuota(ApiModel):
    rolling_hours: int
    limit: int
    used: int
    remaining: int
    resets_at: datetime | None = None


class SocialQuotas(ApiModel):
    friends: FriendQuota
    friend_deletions: FriendDeletionQuota


class FriendsMeta(ApiModel):
    count: int
    quotas: SocialQuotas


class FriendResponse(ApiModel):
    user: PublicUserSummary
    friends_since: datetime


class FriendPage(ApiModel):
    items: list[FriendResponse]
    next_cursor: str | None = None
    meta: FriendsMeta


class FriendRequestCreate(ApiModel):
    recipient_user_id: Annotated[str, Field(min_length=1, max_length=100)]


class FriendRequestDecision(ApiModel):
    decision: Literal["accept", "reject"]


class FriendRequestResponse(ApiModel):
    request_id: str
    sender: PublicUserSummary
    recipient: PublicUserSummary
    status: Literal["pending", "accepted", "rejected", "withdrawn"]
    created_at: datetime
    decided_at: datetime | None = None
    withdrawn_at: datetime | None = None


class FriendRequestPage(ApiModel):
    items: list[FriendRequestResponse]
    next_cursor: str | None = None
    meta: PageMeta


class FriendRequestMutationResponse(ApiModel):
    request: FriendRequestResponse
    quotas: SocialQuotas


class FriendRemovalResponse(ApiModel):
    removed_user_id: str
    quotas: SocialQuotas


class SuggestionPage(ApiModel):
    items: list[SuggestedUser]
    next_cursor: str | None = None
    meta: PageMeta


class PostFormInput(ApiModel):
    client_request_id: Annotated[str, Field(min_length=8, max_length=100)]
    content: str | None = Field(default=None, max_length=2000)
    link_url: str | None = Field(default=None, max_length=2048)
    tags: list[Annotated[str, Field(min_length=1, max_length=50)]] = Field(
        default_factory=list,
        max_length=10,
    )

    @field_validator("content", "link_url", mode="before")
    @classmethod
    def empty_string_to_none(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("link_url")
    @classmethod
    def validate_link_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        lowered = value.lower()
        if not lowered.startswith(("http://", "https://")):
            raise ValueError("链接仅支持 http 或 https")
        return value

    @field_validator("tags")
    @classmethod
    def unique_tags(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(values))

    @model_validator(mode="after")
    def has_text_or_link(self) -> "PostFormInput":
        # The endpoint separately accepts image-only posts.
        return self


class StructuredErrorResponse(ApiModel):
    detail: str
    code: str
    meta: dict[str, Any] | None = None
