"""AACM契約、実配信の200/304、累計保持と監視の非加算を検証する。"""
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app import main
from src.monitoring import AccessCounter, MonitoringAccessFilter, configure_monitoring_logging


@pytest.fixture
def client(tmp_path, monkeypatch):
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<!doctype html><html>Sprout</html>", encoding="utf-8")
    (dist / "app-assets").mkdir()
    (dist / "app-assets" / "main.js").write_text("console.log('test')", encoding="utf-8")
    # 拡張子なしの非HTMLも、Acceptだけで画面扱いしない。
    (dist / "payload").write_bytes(b"binary")
    monkeypatch.setattr(main, "DATA_DIR", tmp_path)
    monkeypatch.setattr(main, "configure_monitoring_logging", lambda path: None)
    monkeypatch.setattr("app.services.frontend_service.FRONTEND_DIST_DIR", dist)
    with TestClient(main.app) as test_client:
        yield test_client


def total(client) -> int:
    return client.get("/health").json()["access_total"]


def test_health_contract_and_monitoring_does_not_increment(client):
    for path in ("/health", "/health/", "/api/health", "/api/health/"):
        for _ in range(3):
            response = client.get(path, follow_redirects=False)
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "ok"
            assert data["version"] == main.app.version
            assert type(data["access_total"]) is int
            assert data["access_total"] == 0


def test_html_200_and_304_count_once_each(client):
    first = client.get("/")
    assert first.status_code == 200
    assert total(client) == 1
    cached = client.get("/", headers={"If-None-Match": first.headers["etag"]})
    assert cached.status_code == 304
    assert "content-type" not in cached.headers
    assert total(client) == 2
    cached_by_date = client.get("/", headers={"If-Modified-Since": first.headers["last-modified"]})
    assert cached_by_date.status_code == 304
    assert total(client) == 3
    assert client.get("/workspace/editor").status_code == 200
    assert total(client) == 4


def test_non_page_requests_are_excluded(client):
    asset = client.get("/app-assets/main.js")
    assert asset.status_code == 200
    assert client.get("/app-assets/main.js", headers={"If-None-Match": asset.headers["etag"]}).status_code == 304
    payload = client.get("/payload", headers={"Accept": "text/html"})
    assert payload.status_code == 200
    assert client.get("/payload", headers={"If-None-Match": payload.headers["etag"]}).status_code == 304
    assert client.get("/api/root").status_code == 200
    client.get("/api/missing")
    assert client.get("/missing.js").status_code == 404
    assert client.post("/").status_code == 405
    assert client.head("/").status_code == 405
    assert total(client) == 0


def test_health_does_not_log_access(client, caplog):
    caplog.set_level(logging.INFO, logger="sprout.monitoring")
    client.get("/health")
    client.get("/api/health/")
    client.get("/app-assets/main.js")
    assert not [record for record in caplog.records if record.name == "sprout.monitoring"]
    client.get("/")
    assert any('"GET /" 200' in record.message for record in caplog.records)


def test_health_stays_available_during_counter_save(client):
    counter = main.app.state.access_counter
    # 保存用ロックが取得済みでも、監視応答は待たない。
    with counter._lock:
        assert total(client) == 0


def test_missing_frontend_build_does_not_increment(client, tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.frontend_service.FRONTEND_DIST_DIR", tmp_path / "missing")
    assert client.get("/").status_code == 404
    assert total(client) == 0


def test_file_logging_is_rotated_and_not_duplicated(tmp_path, monkeypatch):
    root = logging.getLogger()
    access_logger = logging.getLogger("uvicorn.access")
    monkeypatch.setattr(access_logger, "filters", [])
    log_path = tmp_path / "app.log"
    previous_handlers = set(root.handlers)
    try:
        configure_monitoring_logging(log_path)
        configure_monitoring_logging(log_path)
        added = [handler for handler in root.handlers if handler not in previous_handlers]
        assert len(added) == 1
        assert added[0].maxBytes > 0
        assert added[0].backupCount == 5
        assert len(access_logger.filters) == 1
        logging.getLogger("sprout.monitoring").warning("保存失敗の検証")
        assert "保存失敗の検証" in log_path.read_text(encoding="utf-8")
    finally:
        for handler in list(root.handlers):
            if handler not in previous_handlers:
                root.removeHandler(handler)
                handler.close()


def test_counter_survives_restart_and_concurrent_increments(tmp_path):
    path = tmp_path / "data" / "access_counter.json"
    counter = AccessCounter(path)
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(lambda _: counter.increment(), range(40)))
    assert counter.total == 40
    assert AccessCounter(path).total == 40
    assert not path.with_suffix(".json.tmp").exists()


@pytest.mark.parametrize("contents", ["bad json", "[]", '{}', '{"access_total": -1}', '{"access_total": true}'])
def test_invalid_counter_is_logged(tmp_path, caplog, contents):
    path = tmp_path / "access_counter.json"
    path.write_text(contents, encoding="utf-8")
    assert AccessCounter(path).total == 0
    assert "読込失敗" in caplog.text


def test_save_failure_keeps_memory_counter_and_logs_warning(tmp_path, caplog):
    counter = AccessCounter(tmp_path / "access_counter.json")
    with patch.object(Path, "replace", side_effect=OSError("test failure")):
        counter.increment()
    assert counter.total == 1
    assert "保存失敗" in caplog.text


@pytest.mark.parametrize("path", ["/health", "/health/?check=1", "/api/health/", "/app-assets/main.js"])
def test_uvicorn_monitoring_logs_are_filtered(path):
    record = logging.LogRecord("uvicorn.access", logging.INFO, "", 0, "%s %s %s %s %s", ("client", "GET", path, "1.1", 200), None)
    assert not MonitoringAccessFilter().filter(record)


def test_uvicorn_normal_access_is_kept():
    record = logging.LogRecord("uvicorn.access", logging.INFO, "", 0, "%s %s %s %s %s", ("client", "GET", "/", "1.1", 200), None)
    assert MonitoringAccessFilter().filter(record)
