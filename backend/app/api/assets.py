"""アセット配信API。

編集対象HTMLのディレクトリを基点に、相対参照されたCSS/画像/JS等を配信する。
プレビューiframeの <base href> がこのエンドポイントを指す。
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.services import file_service
from app.services.file_service import PathError

router = APIRouter()


@router.get("/assets/{full_path:path}")
def serve_asset(full_path: str) -> FileResponse:
    """絶対パス(URLエンコード済み)を受け取り、許可ルート配下の実ファイルを配信する。"""
    try:
        target = file_service.resolve_asset(full_path)
    except PathError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(target)
