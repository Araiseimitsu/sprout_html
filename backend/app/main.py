"""FastAPIアプリのエントリポイント。

サーバー処理(ファイルI/O・保存・アセット配信)の正本。
フロント(Svelte)はこのAPIのみを通じてファイルを操作する。
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import assets, files
from app.config import ALLOWED_ROOT, FRONTEND_ORIGINS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("sprout")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """起動時に許可ルートをログ出力する。"""
    logger.info("Sprout HTML backend 起動。許可ルート: %s", ALLOWED_ROOT)
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
# ルート直下: アセット配信(base href から相対参照されるため prefix なし)
app.include_router(assets.router)


@app.get("/api/health")
def health() -> dict:
    """ヘルスチェック。"""
    return {"status": "ok", "root": str(ALLOWED_ROOT)}
