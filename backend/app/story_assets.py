from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import tempfile
from typing import Callable
from uuid import UUID, uuid4


class InvalidStoryImage(ValueError):
    """Raised when a story image extension and file signature do not agree."""


def _detect_story_image_extension(filename: str, content: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    rules = {
        ".jpg": lambda data: data.startswith(b"\xff\xd8\xff"),
        ".jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
        ".png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
        ".webp": lambda data: data.startswith(b"RIFF") and data[8:12] == b"WEBP",
    }
    matches = rules.get(suffix)
    if matches is None or not matches(content):
        raise InvalidStoryImage("结局插图仅支持内容真实的 JPEG、PNG 或 WebP 文件")
    return ".jpg" if suffix == ".jpeg" else suffix


def save_story_ending_image(
    source: Path,
    destination_directory: Path,
    *,
    id_factory: Callable[[], UUID] = uuid4,
) -> tuple[Path, str]:
    """Copy an original ending image without transcoding and publish it atomically."""

    content = source.read_bytes()
    extension = _detect_story_image_extension(source.name, content)
    destination_directory.mkdir(parents=True, exist_ok=True)

    filename = f"{id_factory()}{extension}"
    final_path = destination_directory / filename
    descriptor, temporary_path = tempfile.mkstemp(
        dir=destination_directory,
        prefix=".story-ending-",
        suffix=".tmp",
    )
    try:
        with os.fdopen(descriptor, "wb") as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary_path, final_path)
    finally:
        if os.path.exists(temporary_path):
            os.unlink(temporary_path)

    return final_path, f"/api/uploads/story/endings/{filename}"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="无损导入冰人文明结局插图，并输出源文件到公开 URL 的映射。",
    )
    parser.add_argument("sources", nargs="+", type=Path)
    parser.add_argument(
        "--destination",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "uploads" / "story" / "endings",
    )
    arguments = parser.parse_args()

    imported = []
    for source in arguments.sources:
        saved_path, public_url = save_story_ending_image(source, arguments.destination)
        imported.append({
            "source": str(source),
            "saved_path": str(saved_path),
            "url": public_url,
        })
    print(json.dumps(imported, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
