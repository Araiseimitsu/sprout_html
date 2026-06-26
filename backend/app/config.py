"""アプリ設定。

編集対象として許可するルートディレクトリや、CORS許可オリジンを管理する。
ローカル単一ユーザー向けツールだが、パストラバーサル対策としてルート配下のみ操作可能とする。
"""
from __future__ import annotations

import os
from pathlib import Path

# 編集を許可するルートディレクトリ。
# 環境変数 SPROUT_ROOT で上書き可能。未指定時はユーザーのホームディレクトリ。
ALLOWED_ROOT: Path = Path(os.environ.get("SPROUT_ROOT", str(Path.home()))).resolve()

# フロント(Vite開発サーバー)のオリジン。CORS許可に使用する。
FRONTEND_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# 保存時に作成するバックアップの拡張子。
BACKUP_SUFFIX: str = ".bak"
