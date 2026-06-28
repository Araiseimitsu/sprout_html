"""アプリ設定。

初期表示ディレクトリや、CORS許可オリジンを管理する。
ローカル単一ユーザー向けツールとして、絶対パス指定による任意場所のHTML編集を許可する。
"""
from __future__ import annotations

import os
from pathlib import Path

# .env があれば読み込む(任意依存。未導入でも環境変数で動作する)。
try:  # pragma: no cover - 環境依存
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:  # pragma: no cover
    pass

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

# ---- AI(Gemini)関連設定 ----
# APIキーは秘密情報のためバックエンドの環境変数からのみ読み込む(フロントには出さない)。
GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "").strip()

# 使用モデルID。指定名がそのままAPIで通らない場合に備え、環境変数で上書き可能にする。
# テキスト(HTML生成・編集)用モデル。
GEMINI_TEXT_MODEL: str = os.environ.get("GEMINI_TEXT_MODEL", "gemini-3.5-flash").strip()
# 画像生成(nanobanana2)用モデル。
GEMINI_IMAGE_MODEL: str = os.environ.get("GEMINI_IMAGE_MODEL", "nanobanana2").strip()

# 生成画像をファイル保存する際のサブディレクトリ名(ハイブリッド埋め込み時)。
GENERATED_IMAGE_DIR: str = os.environ.get("SPROUT_IMAGE_DIR", "sprout-images").strip()
