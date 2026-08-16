from pathlib import Path

import httpx
import pytest

import backend.app.main as main_module
from backend.app.main import FRONTEND_DIST_ENV, create_app


def build_frontend_fixture(tmp_path: Path) -> tuple[Path, str]:
    frontend_dist = tmp_path / "frontend-dist"
    assets_directory = frontend_dist / "assets"
    assets_directory.mkdir(parents=True)
    marker = "uslike-spa-shell"
    (frontend_dist / "index.html").write_text(
        f"<!doctype html><html><body>{marker}</body></html>",
        encoding="utf-8",
    )
    (assets_directory / "app.js").write_text(
        "window.__USLIKE_ASSET__ = true;",
        encoding="utf-8",
    )
    return frontend_dist, marker


@pytest.mark.anyio
async def test_frontend_dist_serves_deep_routes_static_files_and_head(tmp_path):
    frontend_dist, marker = build_frontend_fixture(tmp_path)
    app = create_app(
        tmp_path / "database" / "uslike.json",
        frontend_dist_path=frontend_dist,
    )
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        deep_route = await client.get(
            "/mvp/story/ice-civilization",
            headers={"Origin": "http://localhost:5173"},
        )
        assert deep_route.status_code == 200
        assert deep_route.headers["content-type"].startswith("text/html")
        assert deep_route.headers["access-control-allow-origin"] == "http://localhost:5173"
        assert marker in deep_route.text

        head_route = await client.head("/mvp/messages/friend--a1b2c3d4")
        assert head_route.status_code == 200
        assert head_route.content == b""
        assert int(head_route.headers["content-length"]) > 0

        static_asset = await client.get("/assets/app.js")
        assert static_asset.status_code == 200
        assert static_asset.headers["content-type"].startswith("text/javascript")
        assert "__USLIKE_ASSET__" in static_asset.text


@pytest.mark.anyio
async def test_api_docs_uploads_and_missing_assets_are_not_spa_fallbacks(tmp_path):
    frontend_dist, marker = build_frontend_fixture(tmp_path)
    database_path = tmp_path / "database" / "uslike.json"
    app = create_app(database_path, frontend_dist_path=frontend_dist)
    uploaded_file = database_path.parent / "uploads" / "fixture.txt"
    uploaded_file.write_text("uploaded fixture", encoding="utf-8")
    ending_directory = database_path.parent / "uploads" / "story" / "endings"
    ending_directory.mkdir(parents=True)
    ending_file = ending_directory / "ending.webp"
    ending_file.write_bytes(b"RIFF\x00\x00\x00\x00WEBP")
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        missing_api = await client.get("/api/does-not-exist")
        assert missing_api.status_code == 404
        assert missing_api.json()["detail"] == "请求的接口不存在"
        assert marker not in missing_api.text

        wrong_api_method = await client.get("/api/auth/login")
        assert wrong_api_method.status_code == 405
        assert wrong_api_method.json()["detail"] == "该接口不支持当前请求方法"

        upload = await client.get("/api/uploads/fixture.txt")
        assert upload.status_code == 200
        assert upload.text == "uploaded fixture"

        ending_upload = await client.get("/api/uploads/story/endings/ending.webp")
        assert ending_upload.status_code == 200
        assert ending_upload.content == ending_file.read_bytes()
        assert ending_upload.headers["content-type"] == "image/webp"

        missing_upload = await client.get("/api/uploads/missing.txt")
        assert missing_upload.status_code == 404
        assert marker not in missing_upload.text

        missing_asset = await client.get("/assets/missing.js")
        assert missing_asset.status_code == 404
        assert marker not in missing_asset.text

        docs = await client.get("/docs")
        assert docs.status_code == 200
        assert "Swagger UI" in docs.text
        assert marker not in docs.text

        redoc = await client.get("/redoc")
        assert redoc.status_code == 200
        assert "ReDoc" in redoc.text
        assert marker not in redoc.text

        openapi = await client.get("/openapi.json")
        assert openapi.status_code == 200
        assert openapi.json()["info"]["title"] == "Uslike MVP API"


@pytest.mark.anyio
async def test_frontend_file_lookup_rejects_encoded_path_traversal(tmp_path):
    frontend_dist, marker = build_frontend_fixture(tmp_path)
    outside_file = tmp_path / "private.txt"
    outside_file.write_text("must-not-leak", encoding="utf-8")
    app = create_app(
        tmp_path / "database" / "uslike.json",
        frontend_dist_path=frontend_dist,
    )
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        for path in (
            "/%2e%2e/private.txt",
            "/assets/%2e%2e/%2e%2e/private.txt",
        ):
            response = await client.get(path)
            assert response.status_code == 404
            assert "must-not-leak" not in response.text
            assert marker not in response.text


@pytest.mark.anyio
async def test_missing_default_dist_keeps_api_only_mode(tmp_path, monkeypatch):
    monkeypatch.delenv(FRONTEND_DIST_ENV, raising=False)
    monkeypatch.setattr(main_module, "DEFAULT_FRONTEND_DIST_PATH", tmp_path / "not-built")
    app = create_app(tmp_path / "database" / "uslike.json")
    transport = httpx.ASGITransport(app=app)

    assert app.state.frontend_dist_path is None
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        page = await client.get("/mvp/messages")
        assert page.status_code == 404
        assert page.json()["detail"] == "请求的接口不存在"

        docs = await client.get("/docs")
        assert docs.status_code == 200


@pytest.mark.anyio
async def test_frontend_dist_can_be_configured_by_environment(tmp_path, monkeypatch):
    frontend_dist, marker = build_frontend_fixture(tmp_path)
    monkeypatch.setenv(FRONTEND_DIST_ENV, str(frontend_dist))
    app = create_app(tmp_path / "database" / "uslike.json")
    transport = httpx.ASGITransport(app=app)

    assert app.state.frontend_dist_path == frontend_dist.resolve()
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        page = await client.get("/mvp/feed")
        assert page.status_code == 200
        assert marker in page.text


@pytest.mark.parametrize("configuration_source", ["argument", "environment"])
def test_explicit_invalid_frontend_dist_fails_clearly(tmp_path, monkeypatch, configuration_source):
    missing_path = tmp_path / "missing-frontend-dist"

    with pytest.raises(RuntimeError, match=r"Frontend dist path .* does not exist"):
        if configuration_source == "argument":
            create_app(
                tmp_path / "argument-db.json",
                frontend_dist_path=missing_path,
            )
        else:
            monkeypatch.setenv(FRONTEND_DIST_ENV, str(missing_path))
            create_app(tmp_path / "environment-db.json")


def test_explicit_frontend_dist_requires_index_html(tmp_path):
    empty_dist = tmp_path / "empty-dist"
    empty_dist.mkdir()

    with pytest.raises(RuntimeError, match=r"does not contain index\.html"):
        create_app(tmp_path / "database.json", frontend_dist_path=empty_dist)


def test_frontend_dist_rejects_index_symlink_outside_dist(tmp_path):
    frontend_dist = tmp_path / "frontend-dist"
    frontend_dist.mkdir()
    outside_index = tmp_path / "private.html"
    outside_index.write_text("private", encoding="utf-8")
    (frontend_dist / "index.html").symlink_to(outside_index)

    with pytest.raises(RuntimeError, match=r"index\.html .* resolves outside"):
        create_app(tmp_path / "database.json", frontend_dist_path=frontend_dist)


@pytest.mark.parametrize("private_path", ["database", "uploads"])
def test_frontend_dist_cannot_overlap_private_storage(tmp_path, private_path):
    if private_path == "database":
        frontend_dist, _ = build_frontend_fixture(tmp_path)
        database_path = frontend_dist / "uslike.json"
    else:
        application_directory = tmp_path / "application"
        frontend_dist = application_directory / "uploads"
        frontend_dist.mkdir(parents=True)
        (frontend_dist / "index.html").write_text("spa", encoding="utf-8")
        database_path = application_directory / "uslike.json"

    with pytest.raises(RuntimeError, match=rf"must not contain the {private_path}"):
        create_app(database_path, frontend_dist_path=frontend_dist)


def test_empty_frontend_dist_environment_is_rejected(tmp_path, monkeypatch):
    monkeypatch.setenv(FRONTEND_DIST_ENV, "")

    with pytest.raises(RuntimeError, match=r"USLIKE_FRONTEND_DIST_PATH must not be empty"):
        create_app(tmp_path / "database.json")
