
# AGENT.md
このファイルは、本プロジェクトにおける AI Agent のプロジェクト固有ルールである。
共通の行動規範は、各エージェントの Global Rule に従うこと。



---


## 1. Rule Priority
AI Agent は以下の順でルールを適用する。

1. ユーザーの明示指示
2. 本ファイル `AGENT.md`
3. `.docs/frontend-svelte.md`
4. 既存コードの設計・命名・構造
5. 各エージェントの Global Rule
ただし、破壊的操作・機密情報・DB操作・外部送信に関しては、常に安全側を優先する。



---


## 2. Project Principle
本プロジェクトでは以下を重視する。

- 技術は可変、設計思想は固定。
- 依存は一方向にする。
- 再現性を最優先する。
- AI が迷わない構造にする。
- 小さく分けて、責務を明確にする。
- 動けばよいではなく、後から直せる構造にする。


---


## 3. Project Layout
基本構造は以下とする。

```txt
project-root/
├─ backend/
├─ frontend/
├─ docker/
├─ tests/
├─ .docs/
├─ README.md
└─ AGENT.md
```

この構造を勝手に崩してはいけない。



---


## 4. Directory Responsibility
| パス | 役割 |
| --- | --- |
| `backend/` | FastAPI / Python 側の実装 |
| `frontend/` | Svelte / Vite 側の実装 |
| `docker/` | Docker 関連ファイル |
| `tests/` | 統合テスト、E2Eテスト、横断的なテスト |
| `.docs/` | 設計ルール、変更履歴、開発ドキュメント |
| `README.md` | セットアップ、起動方法、環境変数の説明 |
| `AGENT.md` | 本プロジェクトの AI Agent ルール |



---


## 5. Implementation Location
実装コードは原則として、各プロジェクト配下の `src/` に配置する。

```txt
backend/
├─ src/
└─ tests/

frontend/
├─ src/
└─ tests/
```

プロジェクトルートに実装コードを直接置くことは禁止する。
ただし、以下は例外とする。

- 設定ファイル
- README
- Docker 関連ファイル
- 起動スクリプト
- AGENT.md
- ドキュメント


---


## 6. Backend Rule
Python バックエンドは FastAPI を基本とする。


### 必須
- Python 管理は `uv` を使用する。
- `pyproject.toml` を使用する。
- `uv.lock` を使用する。
- `uv.lock` は必ずコミット対象とする。
- 依存追加は `uv add` を使用する。
- 実行は `uv run` を使用する。
- テストは `uv run pytest` を使用する。

### 禁止
- `pip` 単独使用
- `poetry` 併用
- `requirements.txt` の手動管理
- 直接 `python` 実行
- グローバル Python 環境への依存
- 仮想環境の手動前提化

### 実行例
```bash
uv venv
uv add fastapi
uv add --dev pytest
uv run python src/app/main.py
uv run pytest
```



---


## 7. Backend Recommended Structure
```txt
backend/
├─ src/
│  └─ app/
│     ├─ main.py
│     ├─ api/
│     ├─ application/
│     ├─ domain/
│     ├─ infrastructure/
│     ├─ core/
│     └─ shared/
├─ tests/
├─ pyproject.toml
├─ uv.lock
├─ .env
└─ .env.example
```

| 層 | 役割 |
| --- | --- |
| `api/` | FastAPI のルーティング、リクエスト、レスポンス |
| `application/` | ユースケース、業務処理の流れ |
| `domain/` | 業務ルール、判定ロジック |
| `infrastructure/` | DB、外部API、ファイル、NAS、メールなど |
| `core/` | 設定、起動、ログ、例外処理 |
| `shared/` | 共通関数、型、定数 |



---


## 8. Frontend Rule
フロントエンドは `frontend/` 配下で管理する。
Svelte 固有のルールは以下を参照する。

```txt
.docs/frontend-svelte.md
```

フロントエンド作業時は、必ず `.docs/frontend-svelte.md` を確認する。



---


## 9. Environment Variables
環境変数は用途ごとに分離する。

| ファイル | 用途 |
| --- | --- |
| `backend/.env` | FastAPI 用 |
| `frontend/.env` | Svelte / Vite 用 |
| root `.env` | Docker Compose や全体起動用 |


### 必須ルール
- `.env` は Git 管理しない。
- `.env.example` は Git 管理する。
- backend の秘密情報を frontend に置かない。
- frontend に置く値は、ブラウザから見えてよいものだけにする。
- frontend の環境変数は `VITE_` 接頭辞を使う。
- DB接続情報、APIキー、秘密鍵、NAS認証情報は `backend/.env` に置く。

### backend .env 例
```env
APP_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/appdb
SECRET_KEY=change_me
CORS_ORIGINS=http://localhost:5173
NAS_BASE_PATH=\\server\share
```


### frontend .env 例
```env
VITE_API_BASE_URL=http://localhost:8000
```


### .gitignore 必須例
```gitignore
.env
.env.*
!.env.example
```



---


## 10. Dependency Rule
依存関係は一方向にする。


### Backend
```txt
api
↓
application
↓
domain

application
↓
infrastructure

shared は全層から参照可能
```


### Frontend
```txt
Presentation
↓
State
↓
Application
↓
Infrastructure

Shared は全層から参照可能
```


### 禁止
- レイヤー逆流
- 循環依存
- UI から Infrastructure 直呼び
- API 層に業務ロジックを書くこと
- Infrastructure 層に画面都合の処理を書くこと


---


## 11. Docker Rule
Docker を使用する場合も、依存管理は各技術の標準に従う。


### Backend
- Docker 内でも `uv` を使用する。
- `uv.lock` ベースで依存同期する。

### Frontend
- Node.js パッケージ管理は `pnpm` を使用する。
- `pnpm-lock.yaml` はコミット対象とする。
- Docker 内でも lock ベースで依存同期する。


---


## 12. Code Quality
- 1ファイル 1000行以内。
- 単一責任原則を守る。
- 共通処理は別モジュールへ分離する。
- 重複・冗長構造を作らない。
- マジックナンバーを使わない。
- 変数名・関数名は意味が明確なものにする。
- 入出力の型を明確にする。
- 例外処理を放置しない。


---


## 13. Tests
テスト導入を前提とする。


### 必須対象
- 業務ロジック
- 判定処理
- API 入出力
- Application 層
- データ変換処理
- ファイル操作の重要処理

### 必須でない対象
- UI表示のみ
- 試作コード
- 一度きりの処理
- スタイルのみの変更

### Commands
```bash
uv run pytest
pnpm test
```



---


## 14. Documentation
重要な変更履歴は以下に記録する。

```txt
.docs/update.md
```


### 記録するもの
- 仕様変更
- 重要な設計変更
- ディレクトリ構成変更
- DB構造変更
- API仕様変更
- 運用上の注意点

### 記録しないもの
- 試行錯誤
- 一時ログ
- 単なるエラー履歴
- 作業メモ
- その場限りの検証内容

### README.md に必ず書くもの
- セットアップ手順
- 実行方法
- テスト方法
- 必要な環境変数
- ディレクトリ構成
- 開発時の注意点


---


## 15. Debugging / Logging
- エラーは必ずログ出力する。
- 原因特定を最優先にする。
- ログレベルは `info` / `warn` / `error` を使い分ける。
- 秘密情報をログに出してはいけない。
- エラーを握りつぶしてはいけない。


---


## 16. Project-Specific Safety
破壊的操作・機密情報・DB操作は Global Rule に従う。
本プロジェクトでは特に以下を事前確認対象とする。

- `.env` 変更
- lock ファイル更新
- DB構造変更
- ディレクトリ構成変更
- 大量ファイル生成
- Docker 設定変更


---


## 17. Code Simplification
以下に該当する場合、完了前にコード簡素化を検討する。

- 30行以上の変更
- 新規モジュール追加
- 可読性低下
- 責務混在
- 重複増加
- 既存構造との不一致
ただし、以下は禁止する。

- 仕様変更
- API変更
- DB変更
- 入出力形式変更
- ユーザー承認なしの大規模リファクタ


---


## 18. Provider MCP / Skills
Codex / OpenCode / Antigravity は、必要に応じて以下を確認する。

- OpenCode の MCP 設定: `~/.config/opencode/opencode.json` と選択 workspace root の `.mcp/settings.json`
- OpenCode のユーザー共通 skill 配置先: `~/.config/opencode/skills`
- OpenCode / Antigravity の project skill 配置先: 選択 workspace root の `skills/`
- Antigravity の MCP 等の CLI 設定: `C:/Users/seizo/.gemini/settings.json` と選択 workspace root の `.mcp/settings.json`
- Antigravity のユーザー共通 skill 配置先: `C:/Users/seizo/.gemini/skills`

| provider | API 経路 | workspace | MCP / skills |
| --- | --- | --- | --- |
| Codex | Codex App Server | Frontend の `workspace_path` を使用 | workspace 基準 |
| OpenCode | ローカル `opencode serve` + 公式 SDK `opencode-ai`（CLI を Backend が起動） | Frontend の `workspace_path` を使用 | tool / MCP は opencode CLI 標準設定に workspace `.mcp/settings.json` を merge。skills は `~/.config/opencode/skills` と workspace root `skills/` を利用 |
| Antigravity | Antigravity CLI (`agy -p`) | Frontend の `workspace_path` を使用 | ターミナルの `agy -p` と同じユーザー設定（MCP 等は `C:/Users/seizo/.gemini/settings.json` に workspace `.mcp/settings.json` を merge、ユーザー共通 skills は `C:/Users/seizo/.gemini/skills`）と workspace root `skills/` を利用 |

OpenCode は Frontend の `workspace_path` でローカル `opencode serve` を Backend が起動し、公式 SDK `opencode-ai` 経由で会話する（毎ターン新規 session を作成する stateless 運用）。`opencode serve` は port 単位で常駐するため、Backend 管理の serve は workspace 変更時に停止して起動し直す。外部起動済みの serve は workspace を保証できないため、workspace 指定時は安全側で拒否する。認証は opencode CLI 標準に委譲し、MCP は `~/.config/opencode/opencode.json` と選択 workspace root の `.mcp/settings.json` を起動時 config として merge する。API キーの env 設定は不要。skills はユーザー共通 `~/.config/opencode/skills` と選択 workspace root の `skills/` を読む。tool 実行（filesystem / MCP / document など）は opencode ネイティブに全委譲し、Backend 自前の tool ループは持たない。Gemini API 直呼びは廃止し、旧 `gemini` / `gemini_cli` provider 入力は Antigravity に正規化する。

MCP は OpenCode / Antigravity 各 CLI の通常ユーザー設定を正本にしつつ、Frontend で選択した workspace root の `.mcp/settings.json` を project-level MCP として merge する。同名 MCP server は workspace 側を優先する。skills は各 CLI のユーザー共通ディレクトリに加え、Frontend で選択した workspace root の `skills/` を project-level skill として読む。

## 19. Google Workspace CLI (`gws`)
Google Workspace（Drive / Sheets / Gmail / Calendar / Docs / Slides / Tasks / People など）に対する操作はシェルツールから `gws` コマンドで実行する。

- **基本形**: `gws <service> <resource> [sub-resource] <method> [--params JSON] [--json JSON]`
- **例**:
    - `gws drive files list --params '{"pageSize": 10}'`
    - `gws gmail users messages list --params '{"userId": "me", "q": "is:unread"}'`
    - `gws calendar events list --params '{"calendarId": "primary"}'`
    - スキーマ確認: `gws schema drive.files.list`
- **自動許可スコープ**:
    - Antigravity: `agy -p` 実行前に PilotBase の shell 承認を通す。
    - OpenCode: `~/.config/opencode/opencode.json` の `permission.bash` で `gws *list*` / `*get*` / `*search*` / `schema*` を `allow`、書き込み系は `ask`。
- **書き込み系（send/create/update/delete/insert/patch/batchUpdate）は必ず事前確認**。実行前に対象アカウント・対象データ・影響範囲を明示すること。
- **不明なメソッド**は `gws <service> --help` または `gws schema <service.resource.method>` を先に確認する。
