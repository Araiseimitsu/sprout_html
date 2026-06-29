"""Vite build 済みフロントエンドの静的ファイル解決。"""
from __future__ import annotations

from pathlib import Path

from app.config import FRONTEND_DIST_DIR


class FrontendBuildError(Exception):
    """フロントエンドの build 成果物が見つからない場合の例外。"""


class FrontendPathError(Exception):
    """配信対象外のパスが指定された場合の例外。"""


def resolve_frontend_file(request_path: str) -> Path:
    """URLパスに対応する dist 内ファイル、または SPA fallback の index.html を返す。"""
    dist_dir = FRONTEND_DIST_DIR
    index_file = dist_dir / "index.html"
    if not index_file.is_file():
        raise FrontendBuildError(f"frontend build not found: {dist_dir}")

    normalized_path = request_path.strip("/")
    if not normalized_path:
        return index_file

    target = (dist_dir / normalized_path).resolve()
    if not target.is_relative_to(dist_dir):
        raise FrontendPathError("invalid frontend asset path")

    if target.is_file():
        return target

    # ビルド済みアセットや public 配下由来の実ファイル参照は、存在しない場合 404 にする。
    # 画面ルートだけ index.html に戻す。
    if normalized_path.startswith("app-assets/") or Path(normalized_path).suffix:
        raise FrontendPathError("frontend asset not found")

    return index_file
