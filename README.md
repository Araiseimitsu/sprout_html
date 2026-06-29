# Sprout HTML Editor

任意の HTML ファイルをローカル UI で編集する Web アプリです。バックエンドがファイル I/O、アセット配信、AI 連携を担当し、フロントエンドが編集 UI と状態管理を担当します。

## 構成

```txt
sprout_html/
├─ backend/   FastAPI API
├─ frontend/  Svelte + Vite UI
├─ samples/   動作確認用 HTML
├─ .docs/     開発ルール、設計メモ
└─ README.md
```

主な責務は次の通りです。

- `backend/app/main.py`: FastAPI アプリのエントリポイント
- `backend/app/api/`: ファイル操作、アセット配信、AI 連携 API
- `backend/app/services/`: ファイル操作などのサービス処理
- `frontend/src/lib/presentation/`: Svelte コンポーネント
- `frontend/src/lib/state/`: UI 状態とストア
- `frontend/src/lib/application/`: ユースケース
- `frontend/src/lib/infrastructure/`: API 通信、編集エンジン
- `frontend/src/lib/shared/`: 型、定数、共通関数

## 必要なもの

- Python 3.11 以上
- `uv`
- Node.js 22 以上
- `pnpm`

## セットアップ

バックエンド:

```bash
cd backend
uv venv
uv pip install -r requirements.txt
copy .env.example .env
```

PowerShell 以外の環境では、最後の行を `cp .env.example .env` に読み替えてください。AI 機能を使う場合は `backend/.env` に `GEMINI_API_KEY` を設定します。

フロントエンド:

```bash
cd frontend
pnpm install
```

## 実行方法

ターミナルを 2 つ使って起動します。

バックエンド:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

フロントエンド:

```bash
cd frontend
pnpm dev
```

ブラウザで `http://localhost:5173` を開きます。Vite の開発サーバーは `/api` と `/assets` をバックエンドへプロキシします。

## 環境変数

バックエンドの環境変数は `backend/.env` に置きます。秘密情報をフロントエンド側へ置かないでください。

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `GEMINI_API_KEY` | AI 機能利用時 | Google AI Studio で取得した API キー |
| `GEMINI_TEXT_MODEL` | 任意 | HTML 生成、編集に使うモデル ID |
| `GEMINI_IMAGE_MODEL` | 任意 | 画像生成に使うモデル ID |
| `SPROUT_IMAGE_DIR` | 任意 | 生成画像の保存サブディレクトリ名 |
| `SPROUT_ROOT` | 任意 | ファイルピッカーの初期表示ディレクトリ |

フロントエンドの環境変数を追加する場合は `frontend/.env` に置き、ブラウザから見えてよい値だけを `VITE_` 接頭辞で定義します。

## テスト

バックエンド:

```bash
cd backend
uv pip install pytest
uv run pytest
```

フロントエンド:

```bash
cd frontend
pnpm test
pnpm check
```

## 開発時の注意

- Python キャッシュ、仮想環境、Node.js 依存、ビルド成果物、`.env` は Git 管理しません。
- `backend/.env.example` のようなサンプル環境変数ファイルは Git 管理します。
- バックエンドの秘密情報をフロントエンドに置かないでください。
- フロントエンドの API 通信は `frontend/src/lib/infrastructure/api/` を経由します。
- 重要な仕様変更、API 変更、ディレクトリ構成変更は `.docs/update.md` に記録します。
