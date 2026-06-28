"""ファイル操作の正本となるサービス層。

パス検証・一覧取得・HTML読み込み・上書き保存(バックアップ付き)を担う。
API層からのみ呼び出し、業務ロジックをここに集約する。
"""
from __future__ import annotations

import logging
import shutil
import time
from dataclasses import dataclass
from pathlib import Path

from app.config import ALLOWED_ROOT, BACKUP_SUFFIX, GENERATED_IMAGE_DIR

logger = logging.getLogger(__name__)

# 一覧で扱う対象拡張子。
HTML_SUFFIXES = {".html", ".htm"}

# MIMEタイプから拡張子への対応(生成画像の保存用)。
_IMAGE_EXT_BY_MIME = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}


class PathError(Exception):
    """不正なパスを指定された場合に送出する。"""


@dataclass
class EntryInfo:
    """ディレクトリ/ファイル一覧の1エントリ。"""

    name: str
    path: str
    is_dir: bool
    is_html: bool


def _resolve_edit_path(raw_path: str | None) -> Path:
    """与えられたパスを編集対象パスとして解決する。

    None または空文字の場合は初期表示用ルート自身を返す。
    絶対パスはそのまま許可し、相対パスは初期表示用ルートから解決する。
    """
    if not raw_path:
        return ALLOWED_ROOT

    candidate = Path(raw_path).expanduser()
    if candidate.is_absolute():
        return candidate.resolve()

    if ".." in candidate.parts:
        logger.warning("相対パスの親ディレクトリ参照を拒否: %s", raw_path)
        raise PathError("相対パスに '..' は使用できません。絶対パスを指定してください")

    return (ALLOWED_ROOT / candidate).resolve()


def list_entries(raw_path: str | None) -> tuple[str, list[EntryInfo]]:
    """指定ディレクトリ直下のエントリ一覧を返す。

    戻り値は (解決済みディレクトリパス, エントリ一覧)。
    ディレクトリとHTMLファイルのみを対象とし、それ以外のファイルは除外する。
    """
    target = _resolve_edit_path(raw_path)
    if not target.exists():
        raise PathError(f"パスが存在しません: {target}")
    if not target.is_dir():
        target = target.parent

    entries: list[EntryInfo] = []
    for child in sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
        is_dir = child.is_dir()
        is_html = child.suffix.lower() in HTML_SUFFIXES
        # ディレクトリとHTMLのみ表示(ノイズ削減)。
        if not is_dir and not is_html:
            continue
        entries.append(
            EntryInfo(
                name=child.name,
                path=str(child),
                is_dir=is_dir,
                is_html=is_html,
            )
        )
    return str(target), entries


def read_html(raw_path: str) -> str:
    """HTMLファイルの中身を文字列で返す。"""
    target = _resolve_edit_path(raw_path)
    if not target.is_file():
        raise PathError(f"ファイルが存在しません: {target}")
    if target.suffix.lower() not in HTML_SUFFIXES:
        raise PathError("HTMLファイル(.html/.htm)のみ開けます")
    logger.info("HTML読み込み: %s", target)
    return target.read_text(encoding="utf-8")


def save_html(raw_path: str, content: str) -> str:
    """HTMLを上書き保存する。既存ファイルがある場合は .bak バックアップを作成する。

    破壊的操作のため、書き込み前に必ずバックアップを取り、戻せる状態を保証する。
    """
    target = _resolve_edit_path(raw_path)
    if target.suffix.lower() not in HTML_SUFFIXES:
        raise PathError("HTMLファイル(.html/.htm)のみ保存できます")

    if target.exists():
        backup = target.with_suffix(target.suffix + BACKUP_SUFFIX)
        shutil.copy2(target, backup)
        logger.info("バックアップ作成: %s", backup)

    target.write_text(content, encoding="utf-8")
    logger.info("HTML保存: %s", target)
    return str(target)


def resolve_asset(raw_path: str) -> Path:
    """アセット配信用にパスを解決する(許可ルート配下の実ファイルのみ)。"""
    target = _resolve_edit_path(raw_path)
    if not target.is_file():
        raise PathError(f"アセットが存在しません: {target}")
    return target


def save_generated_image(reference_html_path: str, data: bytes, mime: str) -> tuple[str, str]:
    """生成画像を、編集中HTMLと同じディレクトリ配下の画像フォルダへ保存する。

    戻り値は (保存した絶対パス, HTMLから参照する相対src)。
    相対srcは編集中HTMLのディレクトリ基点なので、<base href> 経由で解決できる。
    """
    ref = _resolve_edit_path(reference_html_path)
    base_dir = ref.parent if ref.suffix else ref
    image_dir = base_dir / GENERATED_IMAGE_DIR
    image_dir.mkdir(parents=True, exist_ok=True)

    ext = _IMAGE_EXT_BY_MIME.get(mime, ".png")
    filename = f"gen-{int(time.time() * 1000)}{ext}"
    target = image_dir / filename
    target.write_bytes(data)
    logger.info("生成画像を保存: %s", target)

    relative_src = f"{GENERATED_IMAGE_DIR}/{filename}"
    return str(target), relative_src
