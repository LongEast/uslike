import json
import os
import tempfile
import threading
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Callable, TypeVar


T = TypeVar("T")


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


class JsonDatabase:
    """Small, single-process JSON store with locked, atomic writes."""

    def __init__(self, path: str | Path):
        self.path = Path(path)
        self._lock = threading.RLock()

    def _empty_database(self) -> dict[str, Any]:
        now = utc_now_iso()
        return {
            "metadata": {
                "schema_version": 3,
                "created_at": now,
                "updated_at": now,
            },
            "users": [],
            "sessions": [],
            "behavior_events": [],
            "social": self._empty_social_data(),
        }

    @staticmethod
    def _empty_social_data() -> dict[str, list[dict[str, Any]]]:
        return {
            "posts": [],
            "comments": [],
            "post_likes": [],
            "post_bookmarks": [],
            "comment_likes": [],
            "friend_requests": [],
            "friendships": [],
            "friend_deletion_events": [],
        }

    def _load_unlocked(self) -> dict[str, Any]:
        if not self.path.exists():
            return self._empty_database()

        with self.path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        if not all(key in data for key in ("metadata", "users", "sessions")):
            raise ValueError(f"Uslike JSON 数据库格式无效：{self.path}")
        data.setdefault("behavior_events", [])
        social = data.setdefault("social", {})
        for collection, default in self._empty_social_data().items():
            social.setdefault(collection, default)
        data["metadata"]["schema_version"] = max(data["metadata"].get("schema_version", 1), 3)
        return data

    def _write_unlocked(self, data: dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        data["metadata"]["updated_at"] = utc_now_iso()
        descriptor, temporary_path = tempfile.mkstemp(
            dir=self.path.parent,
            prefix=f".{self.path.name}.",
            suffix=".tmp",
        )
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as file:
                json.dump(data, file, ensure_ascii=False, indent=2)
                file.write("\n")
                file.flush()
                os.fsync(file.fileno())
            os.replace(temporary_path, self.path)
        finally:
            if os.path.exists(temporary_path):
                os.unlink(temporary_path)

    def read(self) -> dict[str, Any]:
        with self._lock:
            return deepcopy(self._load_unlocked())

    def mutate(self, operation: Callable[[dict[str, Any]], T]) -> T:
        with self._lock:
            data = self._load_unlocked()
            result = operation(data)
            self._write_unlocked(data)
            return result
