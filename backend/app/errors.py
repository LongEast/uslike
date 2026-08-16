from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(StarletteHTTPException):
    """HTTP error with a stable machine-readable code and optional metadata."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        code: str,
        *,
        meta: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.code = code
        self.meta = meta


FIELD_NAMES = {
    "phone": "手机号",
    "new_phone": "新手机号",
    "current_password": "当前密码",
    "new_password": "新密码",
    "password": "密码",
    "profile": "个人资料",
    "nickname": "昵称",
    "age": "年龄",
    "gender": "性别",
    "region": "地域",
    "interests": "兴趣标签",
    "social_preferences": "社交偏好",
    "values_test": "价值观测试",
    "version": "题库版本",
    "presented_question_ids": "展示题目 ID",
    "answers": "问卷答案",
    "question_id": "题目 ID",
    "question": "题目内容",
    "answer": "答案",
    "module": "引导模块",
    "event": "引导事件",
    "step": "引导步骤",
    "content": "内容",
    "link_url": "链接",
    "tags": "标签",
    "images": "图片",
    "reply_to_comment_id": "回复目标",
    "recipient_user_id": "接收用户",
    "decision": "申请处理结果",
    "direction": "申请方向",
    "cursor": "分页游标",
    "limit": "分页数量",
    "body": "请求内容",
    "query": "查询参数",
    "path": "路径参数",
    "header": "请求头",
}


HTTP_ERROR_MESSAGES = {
    400: "请求内容不正确",
    401: "未提供有效的登录凭证",
    403: "没有权限执行此操作",
    404: "请求的接口不存在",
    405: "该接口不支持当前请求方法",
    409: "请求与当前数据状态冲突",
    413: "上传内容过大",
    415: "上传内容格式不受支持",
    422: "请求内容格式不正确",
    429: "操作过于频繁，请稍后重试",
    500: "服务器内部错误，请稍后重试",
}


def field_name(location: tuple[Any, ...] | list[Any]) -> str:
    for part in reversed(location):
        if isinstance(part, str) and part in FIELD_NAMES:
            return FIELD_NAMES[part]
    return "输入内容"


def validation_message(error: dict[str, Any]) -> str:
    error_type = error.get("type", "")
    context = error.get("ctx") or {}
    field = field_name(error.get("loc", ()))

    if error_type == "missing":
        return f"{field}为必填项"
    if error_type in {"string_type", "string_unicode"}:
        return f"{field}必须是文本"
    if error_type in {"int_type", "int_parsing"}:
        return f"{field}必须是整数"
    if error_type in {"list_type", "tuple_type"}:
        return f"{field}必须是列表"
    if error_type in {"dict_type", "model_type", "model_attributes_type"}:
        return f"{field}必须是对象"
    if error_type == "bool_type":
        return f"{field}必须是布尔值"
    if error_type == "string_too_short":
        return f"{field}长度不能少于 {context.get('min_length')} 个字符"
    if error_type == "string_too_long":
        return f"{field}长度不能超过 {context.get('max_length')} 个字符"
    if error_type == "too_short":
        return f"{field}不能少于 {context.get('min_length')} 项"
    if error_type == "too_long":
        return f"{field}不能超过 {context.get('max_length')} 项"
    if error_type == "greater_than_equal":
        return f"{field}不能小于 {context.get('ge')}"
    if error_type == "less_than_equal":
        return f"{field}不能大于 {context.get('le')}"
    if error_type in {"literal_error", "enum"}:
        return f"{field}不是允许的选项"
    if error_type == "string_pattern_mismatch":
        return f"{field}格式不正确"
    if error_type in {"json_invalid", "json_type"}:
        return "请求内容不是有效的 JSON"
    if error_type == "extra_forbidden":
        return f"{field}不是支持的字段"
    if error_type == "value_error":
        custom_error = str(context.get("error", "")).strip()
        if custom_error:
            return custom_error
    return f"{field}格式不正确"


async def request_validation_exception_handler(
    _request: Request,
    exception: RequestValidationError,
) -> JSONResponse:
    details = [
        {
            "loc": list(error.get("loc", ())),
            "msg": validation_message(error),
            "type": error.get("type", "validation_error"),
        }
        for error in exception.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": details})


async def http_exception_handler(_request: Request, exception: StarletteHTTPException) -> JSONResponse:
    detail = exception.detail
    if not isinstance(detail, str) or not any("\u4e00" <= char <= "\u9fff" for char in detail):
        detail = HTTP_ERROR_MESSAGES.get(exception.status_code, "请求处理失败")
    content: dict[str, Any] = {"detail": detail}
    if isinstance(exception, ApiError):
        content["code"] = exception.code
        if exception.meta is not None:
            content["meta"] = exception.meta
    return JSONResponse(
        status_code=exception.status_code,
        content=content,
        headers=exception.headers,
    )


async def unhandled_exception_handler(_request: Request, _exception: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": HTTP_ERROR_MESSAGES[500]})
