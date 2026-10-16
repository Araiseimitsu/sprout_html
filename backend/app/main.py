"""FastAPIアプリのエントリポイント。

サーバー処理(ファイルI/O・保存・アセット配信)の正本。
フロント(Svelte)はこのAPIのみを通じてファイルを操作する。
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from starlette.responses import Response
from starlette.staticfiles import StaticFiles

from app.api import ai, assets, files
from app.config import ALLOWED_ROOT, FRONTEND_DIST_DIR, FRONTEND_ORIGINS, SPROUT_HOST_ROOT
from app.services.frontend_service import FrontendBuildError, FrontendPathError, resolve_frontend_file
from src.monitoring import AccessCounter, RecordAccessMiddleware, configure_monitoring_logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sprout")
APP_VERSION = "0.1.0"
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.environ.get("DATA_DIR", str(PROJECT_ROOT))).resolve()
frontend_static = StaticFiles()


@asynccontextmanager
async def lifespan(application: FastAPI):
    """起動時にファイルピッカーの初期表示ルートをログ出力する。"""
    configure_monitoring_logging(DATA_DIR / "app.log")
    application.state.access_counter = AccessCounter(DATA_DIR / "access_counter.json")
    logger.info("Sprout HTML backend 起動。初期表示ルート: %s", ALLOWED_ROOT)
    logger.info("フロントエンド build 配信元: %s", FRONTEND_DIST_DIR)
    if SPROUT_HOST_ROOT:
        logger.info("Windowsホスト表示ルート: %s", SPROUT_HOST_ROOT)
    yield


app = FastAPI(title="Sprout HTML Editor", version=APP_VERSION, lifespan=lifespan)
app.add_middleware(RecordAccessMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# /api 配下: ファイル操作API
app.include_router(files.router, prefix="/api")
# /api 配下: AI(生成・編集・画像)API
app.include_router(ai.router, prefix="/api")
# ルート直下: アセット配信(base href から相対参照されるため prefix なし)
app.include_router(assets.router)


@app.get("/api/health")
@app.get("/api/health/", include_in_schema=False)
@app.get("/health")
@app.get("/health/", include_in_schema=False)
async def health(request: Request) -> dict:
    """外部I/Oを行わず、AACMの2秒制限内で監視データを返す。"""
    return {
        "status": "ok",
        "version": APP_VERSION,
        "access_total": request.app.state.access_counter.total,
        "root": str(ALLOWED_ROOT),
        "host_root": SPROUT_HOST_ROOT,
    }


@app.get("/{full_path:path}", include_in_schema=False, response_model=None)
def serve_frontend(request: Request, full_path: str) -> Response:
    """Vite build 済みフロントエンドを配信する。"""
    try:
        target = resolve_frontend_file(full_path)
        request.state.is_frontend_html = target.suffix.lower() in {".html", ".htm"}
        # Starletteの条件付き配信で、HTML・静的ファイルともに304を正しく返す。
        return frontend_static.file_response(target, target.stat(), request.scope)
    except FrontendBuildError as exc:
        logger.warning("%s", exc)
        return PlainTextResponse(
            "Frontend build not found. Run `pnpm build` in frontend/ first.",
            status_code=404,
        )
    except FrontendPathError as exc:
        logger.warning("%s: %s", exc, full_path)
        return PlainTextResponse("Not Found", status_code=404)
