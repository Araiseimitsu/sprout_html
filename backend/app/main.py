"""FastAPIアプリのエントリポイント。

サーバー処理(ファイルI/O・保存・アセット配信)の正本。
フロント(Svelte)はこのAPIのみを通じてファイルを操作する。
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse

from app.api import ai, assets, files
from app.config import ALLOWED_ROOT, FRONTEND_DIST_DIR, FRONTEND_ORIGINS, SPROUT_HOST_ROOT
from app.services.frontend_service import FrontendBuildError, FrontendPathError, resolve_frontend_file

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sprout")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """起動時にファイルピッカーの初期表示ルートをログ出力する。"""
    logger.info("Sprout HTML backend 起動。初期表示ルート: %s", ALLOWED_ROOT)
    logger.info("フロントエンド build 配信元: %s", FRONTEND_DIST_DIR)
    if SPROUT_HOST_ROOT:
        logger.info("Windowsホスト表示ルート: %s", SPROUT_HOST_ROOT)
    yield


app = FastAPI(title="Sprout HTML Editor", version="0.1.0", lifespan=lifespan)

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
def health() -> dict:
    """ヘルスチェック。"""
    return {"status": "ok", "root": str(ALLOWED_ROOT), "host_root": SPROUT_HOST_ROOT}


@app.get("/{full_path:path}", include_in_schema=False, response_model=None)
def serve_frontend(full_path: str) -> FileResponse | PlainTextResponse:
    """Vite build 済みフロントエンドを配信する。"""
    try:
        return FileResponse(resolve_frontend_file(full_path))
    except FrontendBuildError as exc:
        logger.warning("%s", exc)
        return PlainTextResponse(
            "Frontend build not found. Run `pnpm build` in frontend/ first.",
            status_code=404,
        )
    except FrontendPathError as exc:
        logger.warning("%s: %s", exc, full_path)
        return PlainTextResponse("Not Found", status_code=404)
