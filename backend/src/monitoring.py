"""AACM監視向けの軽量な累計参照と、画面アクセスの永続化。"""
from __future__ import annotations

import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from threading import Lock
from urllib.parse import urlsplit

from fastapi import Request
from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

logger = logging.getLogger("sprout.monitoring")
HEALTH_PATHS = frozenset({"/health", "/api/health"})
STATIC_PREFIXES = ("/assets/", "/app-assets/", "/static/", "/_app/")
STATIC_PATHS = frozenset({"/favicon.ico", "/robots.txt", "/sw.js", "/manifest.webmanifest"})
LOG_MAX_BYTES = 5 * 1024 * 1024
LOG_BACKUP_COUNT = 5


def excluded_path(path: str) -> bool:
    """監視・静的ファイルは画面集計とアクセスログから除く。"""
    return (
        path.rstrip("/") in HEALTH_PATHS
        or path.startswith(STATIC_PREFIXES)
        or path in STATIC_PATHS
    )


class AccessCounter:
    """単一プロセス用。書込みを直列化し、監視はディスクを待たずに読む。"""

    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = Lock()
        self._total = self._load()

    def _load(self) -> int:
        try:
            value = json.loads(self.path.read_text(encoding="utf-8"))["access_total"]
            if type(value) is not int or value < 0:
                raise ValueError("invalid counter")
            return value
        except FileNotFoundError:
            return 0
        except (OSError, ValueError, KeyError, TypeError):
            logger.warning("access_counter 読込失敗。累計を0から開始します。", exc_info=True)
            return 0

    @property
    def total(self) -> int:
        return self._total

    def increment(self) -> None:
        with self._lock:
            self._total += 1
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                temporary = self.path.with_suffix(".json.tmp")
                temporary.write_text(json.dumps({"access_total": self._total}), encoding="utf-8")
                temporary.replace(self.path)
            except OSError:
                logger.warning("access_counter 保存失敗。再起動時に累計が失われる可能性があります。", exc_info=True)


class MonitoringAccessFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # Uvicornの標準アクセスログでも監視を除外し、CLI起動時の肥大化を防ぐ。
        if isinstance(record.args, tuple) and len(record.args) == 5:
            return not excluded_path(urlsplit(str(record.args[2])).path)
        return True


def configure_monitoring_logging(log_path: Path) -> None:
    """ファイルログの二重登録を防ぎ、監視はUvicornのログからも除外する。"""
    root = logging.getLogger()
    if not any(
        isinstance(handler, RotatingFileHandler) and handler.baseFilename == str(log_path.resolve())
        for handler in root.handlers
    ):
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handler = RotatingFileHandler(
            log_path, maxBytes=LOG_MAX_BYTES, backupCount=LOG_BACKUP_COUNT, encoding="utf-8"
        )
        handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
        root.addHandler(handler)
    access_logger = logging.getLogger("uvicorn.access")
    if not any(isinstance(item, MonitoringAccessFilter) for item in access_logger.filters):
        access_logger.addFilter(MonitoringAccessFilter())


class RecordAccessMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path
        if excluded_path(path):
            return await call_next(request)
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("リクエスト処理失敗: %s %s", request.method, path)
            raise
        is_api = path == "/api" or path.startswith("/api/")
        is_html = response.headers.get("content-type", "").split(";", 1)[0] == "text/html"
        is_html_revalidation = response.status_code == 304 and getattr(request.state, "is_frontend_html", False)
        if request.method == "GET" and not is_api and (
            (response.status_code == 200 and is_html) or is_html_revalidation
        ):
            await run_in_threadpool(request.app.state.access_counter.increment)
        logger.info('"%s %s" %s', request.method, path, response.status_code)
        return response
