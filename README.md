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
- Docker Desktop または Docker Engine

## セットアップ

バックエンド:

```bash
cd backend
uv venv
uv sync
copy .env.example .env
```

PowerShell 以外の環境では、最後の行を `cp .env.example .env` に読み替えてください。AI 機能を使う場合は `backend/.env` に `GEMINI_API_KEY` を設定します。

フロントエンド:

```bash
cd frontend
pnpm install
```

## 実行方法

### 開発時

バックエンドだけで起動する場合は、先にフロントエンドを build します。

```bash
cd frontend
pnpm build
```

バックエンド:

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8011
```

ブラウザで `http://localhost:8011` を開きます。FastAPI が `frontend/dist` を配信し、`/api` と `/assets` も同じポートで処理します。

Vite 開発サーバーを使って UI を開発する場合は、別ターミナルで起動します。

```bash
cd frontend
pnpm dev
```

この場合は `http://localhost:5173` を開きます。Vite の開発サーバーは `/api` と `/assets` を `http://127.0.0.1:8011` へプロキシします。

### 社内 Windows PC サーバー / Docker Compose

プロジェクトルートの `.env.example` を `.env` にコピーし、編集対象 HTML を置く Windows 側ディレクトリを設定します。

```env
SPROUT_HOST_ROOT=C:\path\to\html-root
SPROUT_HTTP_PORT=80
```

バックエンド用の `backend/.env.example` も `backend/.env` にコピーします。AI 機能を使う場合は `GEMINI_API_KEY` を設定してください。

起動:

```bash
docker compose up -d --build
```

停止:

```bash
docker compose down
```

ブラウザで `http://<サーバーIP>/` を開きます。`SPROUT_HTTP_PORT` を `8080` などにした場合は `http://<サーバーIP>:8080/` です。

Docker 構成では、`SPROUT_HOST_ROOT` をコンテナ内の `/workspace/html` に bind mount します。UI には `C:\...` 形式の Windows パスを表示し、バックエンド内部では `/workspace/html/...` に変換して読み書きします。指定できる Windows パスは安全のため `SPROUT_HOST_ROOT` 配下に限定されます。

## 環境変数

バックエンドの環境変数は `backend/.env` に置きます。秘密情報をフロントエンド側へ置かないでください。

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `GEMINI_API_KEY` | AI 機能利用時 | Google AI Studio で取得した API キー |
| `GEMINI_TEXT_MODEL` | 任意 | AIモードの既定モデル ID。既定は `gemini-3.1-flash-lite`、UIから `gemini-3.5-flash` も選択可能 |
| `GEMINI_IMAGE_MODEL` | 任意 | 画像生成に使うモデル ID |
| `SPROUT_IMAGE_DIR` | 任意 | 生成画像の保存サブディレクトリ名 |
| `SPROUT_ROOT` | 任意 | ファイルピッカーの初期表示ディレクトリ |
| `SPROUT_HOST_ROOT` | Docker時必須 | UIに表示する Windows 側の編集対象ルート |
| `SPROUT_CONTAINER_ROOT` | Docker時任意 | コンテナ内の編集対象ルート。Compose では `/workspace/html` |

Docker Compose 用の環境変数はプロジェクトルートの `.env` に置きます。

| 変数 | 必須 | 説明 |
| --- | --- | --- |
| `SPROUT_HOST_ROOT` | 必須 | bind mount する Windows 側ディレクトリ |
| `SPROUT_HTTP_PORT` | 任意 | Nginx を公開するポート。既定は `80` |
| `CORS_ORIGINS` | 任意 | FastAPI を直接別オリジンから呼ぶ場合の許可オリジン |

フロントエンドの環境変数を追加する場合は `frontend/.env` に置き、ブラウザから見えてよい値だけを `VITE_` 接頭辞で定義します。

## テスト

バックエンド:

```bash
cd backend
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
