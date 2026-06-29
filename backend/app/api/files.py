"""ファイル関連APIのルーティング。

サービス層(file_service)を呼び出すだけの薄い層に保つ。
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.config import ALLOWED_ROOT
from app.services import file_service
from app.services.file_service import PathError

logger = logging.getLogger(__name__)
router = APIRouter()


class SaveRequest(BaseModel):
    """保存リクエストボディ。"""

    path: str
    content: str


@router.get("/root")
def get_root() -> dict:
    """ファイルピッカーの初期表示ディレクトリを返す。"""
    return {"root": file_service.to_display_path(ALLOWED_ROOT)}


@router.get("/browse")
def browse(path: str | None = Query(default=None)) -> dict:
    """ディレクトリ一覧を返す(ファイルピッカー用)。"""
    try:
        current, parent, entries = file_service.list_entries(path)
    except PathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "current": current,
        "parent": parent,
        "entries": [entry.__dict__ for entry in entries],
    }


@router.get("/save-dialog")
def save_file_dialog(path: str | None = Query(default=None)) -> dict:
    """ローカルPCの標準保存ダイアログでHTMLファイルの保存先を選ぶ。"""
    try:
        selected = file_service.choose_html_save_path(path)
    except PathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"path": selected, "canceled": selected is None}


@router.get("/file-dialog")
def open_file_dialog() -> dict:
    """ローカルPCの標準ファイル選択ダイアログでHTMLファイルを選ぶ。"""
    try:
        selected = file_service.choose_html_file()
    except PathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"path": selected, "canceled": selected is None}


@router.get("/file")
def get_file(path: str = Query(...)) -> dict:
    """HTMLファイルの中身を返す。"""
    try:
        content = file_service.read_html(path)
    except PathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        logger.error("ファイル読み込み失敗: %s", exc)
        raise HTTPException(status_code=500, detail="ファイルの読み込みに失敗しました") from exc
    return {"path": path, "content": content}


@router.post("/file")
def save_file(req: SaveRequest) -> dict:
    """HTMLを上書き保存する。"""
    try:
        saved = file_service.save_html(req.path, req.content)
    except PathError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OSError as exc:
        logger.error("ファイル保存失敗: %s", exc)
        raise HTTPException(status_code=500, detail="ファイルの保存に失敗しました") from exc
    return {"path": saved, "saved": True}
