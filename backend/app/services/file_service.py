"""ファイル操作の正本となるサービス層。

パス検証・一覧取得・HTML読み込み・上書き保存(バックアップ付き)を担う。
API層からのみ呼び出し、業務ロジックをここに集約する。
"""
from __future__ import annotations

import logging
import shutil
from dataclasses import dataclass
from pathlib import Path

from app.config import ALLOWED_ROOT, BACKUP_SUFFIX

logger = logging.getLogger(__name__)

# 一覧で扱う対象拡張子。
HTML_SUFFIXES = {".html", ".htm"}


class PathError(Exception):
    """許可ルート外、または不正なパスを指定された場合に送出する。"""


@dataclass
class EntryInfo:
    """ディレクトリ/ファイル一覧の1エントリ。"""

    name: str
    path: str
    is_dir: bool
    is_html: bool


def _resolve_within_root(raw_path: str | None) -> Path:
    """与えられたパスを解決し、許可ルート配下であることを検証する。

    None または空文字の場合は許可ルート自身を返す。
    ルート外を指す場合は PathError を送出する。
    """
    if not raw_path:
        return ALLOWED_ROOT

    candidate = Path(raw_path).expanduser()
    if not candidate.is_absolute():
        candidate = ALLOWED_ROOT / candidate
    resolved = candidate.resolve()

    # ルート自身、またはその配下のみ許可する。
    if resolved != ALLOWED_ROOT and ALLOWED_ROOT not in resolved.parents:
        logger.warning("許可ルート外へのアクセスを拒否: %s", resolved)
        raise PathError(f"許可されたルート({ALLOWED_ROOT})の外は操作できません")
    return resolved


def list_entries(raw_path: str | None) -> tuple[str, list[EntryInfo]]:
    """指定ディレクトリ直下のエントリ一覧を返す。

    戻り値は (解決済みディレクトリパス, エントリ一覧)。
    ディレクトリとHTMLファイルのみを対象とし、それ以外のファイルは除外する。
    """
    target = _resolve_within_root(raw_path)
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
    target = _resolve_within_root(raw_path)
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
    target = _resolve_within_root(raw_path)
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
    target = _resolve_within_root(raw_path)
    if not target.is_file():
        raise PathError(f"アセットが存在しません: {target}")
    return target
