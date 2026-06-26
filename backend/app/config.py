"""アプリ設定。

初期表示ディレクトリや、CORS許可オリジンを管理する。
ローカル単一ユーザー向けツールとして、絶対パス指定による任意場所のHTML編集を許可する。
"""
from __future__ import annotations

import os
from pathlib import Path

# ファイルピッカーの初期表示ディレクトリ。
# 環境変数 SPROUT_ROOT で上書き可能。未指定時はユーザーのホームディレクトリ。
ALLOWED_ROOT: Path = Path(os.environ.get("SPROUT_ROOT", str(Path.home()))).resolve()

# フロント(Vite開発サーバー)のオリジン。CORS許可に使用する。
FRONTEND_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# 保存時に作成するバックアップの拡張子。
BACKUP_SUFFIX: str = ".bak"
