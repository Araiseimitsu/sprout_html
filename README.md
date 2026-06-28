# Sprout HTML エディタ

任意のHTMLファイルを、UI上で直感的に編集できるローカルWebアプリ。
編集エンジン(ライブDOM方式)に加え、**Gemini によるHTML生成/編集と画像生成(nanobanana2)** を備える。

- backend: FastAPI（ファイル一覧/読み込み/保存、アセット配信、AI連携の正本）
- frontend: Svelte + Vite（UI・編集エンジン・状態管理）

## セットアップ

### バックエンド

```bash
cd backend
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # 値を設定(下記「環境変数」参照)
```

### フロントエンド

```bash
cd frontend
pnpm install
```

## 実行方法

```bash
# 1) バックエンド(ポート8000)
cd backend && . .venv/bin/activate
uvicorn app.main:app --reload

# 2) フロントエンド(ポート5173。/api・/assets は backend にプロキシ)
cd frontend && pnpm dev
```

ブラウザで http://localhost:5173 を開く。ツールバーの「✨ AI」からAI機能を利用できる。

- ページ生成: 要望からHTMLをゼロ生成（保存先パスは任意指定）
- 全体を編集: 開いているページ全体をAIで書き換え
- 部品を編集: 選択中の要素だけをAIで書き換え
- 画像生成: 画像を生成し選択要素(なければ末尾)に挿入

## 環境変数（backend/.env）

| 変数 | 必須 | 説明 |
|---|---|---|
| `GEMINI_API_KEY` | ✅(AI機能利用時) | Google AI Studio で取得したAPIキー。フロントには出さない |
| `GEMINI_TEXT_MODEL` | - | テキスト(HTML)生成モデルID。既定 `gemini-3.5-flash` |
| `GEMINI_IMAGE_MODEL` | - | 画像生成モデルID。既定 `nanobanana2` |
| `SPROUT_IMAGE_DIR` | - | 生成画像の保存サブディレクトリ名。既定 `sprout-images` |
| `SPROUT_ROOT` | - | ファイルピッカーの初期表示ディレクトリ。既定はホーム |

> モデルIDの既定値で動作しない場合は、利用可能な正しいIDに変更してください
> （例: `GEMINI_TEXT_MODEL=gemini-2.5-flash` / `GEMINI_IMAGE_MODEL=gemini-2.5-flash-image`）。

## テスト

```bash
cd frontend && pnpm test     # フロント(application層・ユーティリティ)
cd backend && python -m pytest   # バックエンド(パス検証など)
```
