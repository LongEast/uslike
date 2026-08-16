from pathlib import Path
from uuid import UUID

import pytest

from backend.app.story_assets import InvalidStoryImage, save_story_ending_image


FIXED_ID = UUID("12345678-1234-5678-1234-567812345678")


@pytest.mark.parametrize(
    ("filename", "content", "expected_suffix"),
    [
        ("ending.jpeg", b"\xff\xd8\xfforiginal-jpeg", ".jpg"),
        ("ending.png", b"\x89PNG\r\n\x1a\noriginal-png", ".png"),
        ("ending.webp", b"RIFF\x00\x00\x00\x00WEBPoriginal-webp", ".webp"),
    ],
)
def test_story_ending_import_preserves_original_bytes_and_uses_uuid_name(
    tmp_path: Path,
    filename: str,
    content: bytes,
    expected_suffix: str,
):
    source = tmp_path / filename
    source.write_bytes(content)

    saved_path, public_url = save_story_ending_image(
        source,
        tmp_path / "uploads" / "story" / "endings",
        id_factory=lambda: FIXED_ID,
    )

    assert saved_path.name == f"{FIXED_ID}{expected_suffix}"
    assert saved_path.read_bytes() == content
    assert public_url == f"/api/uploads/story/endings/{saved_path.name}"
    assert not list(saved_path.parent.glob(".story-ending-*.tmp"))


@pytest.mark.parametrize(
    ("filename", "content"),
    [
        ("ending.png", b"not-a-png"),
        ("ending.gif", b"GIF89a"),
        ("ending.webp", b"RIFF\x00\x00\x00\x00NOPE"),
    ],
)
def test_story_ending_import_rejects_unsupported_or_spoofed_files(
    tmp_path: Path,
    filename: str,
    content: bytes,
):
    source = tmp_path / filename
    source.write_bytes(content)

    with pytest.raises(InvalidStoryImage):
        save_story_ending_image(source, tmp_path / "uploads" / "story" / "endings")
