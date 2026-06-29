# Update Log

## 2026-06-29

- Backend: FastAPI が `frontend/dist` の build 済みフロントエンドを配信するようにし、ローカル起動ポートを `8011` 前提に更新。
- Frontend: 「実行プレビュー」ボタンを廃止し、「全画面表示」で script 有効の完全版プレビューを開く構成に整理。
- Frontend: Sprout HTML Editor 用の PWA アイコン画像を追加し、manifest と iOS/ブラウザ向けアイコン参照を設定。
- File Picker: サーバー/Docker 実行時の Windows 表示パスの親ディレクトリ計算を修正し、ファイルを開く画面でパスを直接入力して移動できるようにした。
- Frontend: HTML ファイルのドラッグ&ドロップ読み込みに対応。Web/PWA の制約で絶対パスは取得できないため、ドロップ時は内容を一時読み込みする。
- Frontend: script を有効にして表示する読み取り専用の実行プレビューを追加。編集 iframe は従来どおり script 無効のまま維持。
- Frontend: 編集 iframe で退避した script 本文を `template.content` に保持し、実行プレビューでインライン script が空にならないように修正。
- Frontend: 編集 iframe では script を template に退避する方式へ変更し、sandbox の script ブロックログを抑制。PWA 用に `mobile-web-app-capable` meta を追加。
- File Picker: Windows の特殊フォルダ/ジャンクションで同じ実体パスが重複しても一覧描画が落ちないよう、表示パス保持と一意キー生成を修正。
- Frontend: 編集 iframe の sandbox を外し、ページ側 script は template 退避で止める構成に変更。sandbox 関連のブラウザ警告を回避する。
- Docker: Windows PC サーバー向けに `docker-compose.yml`、バックエンド/フロントエンド Dockerfile、Nginx 設定を追加。Nginx が静的フロントを配信し、`/api` と `/assets` を FastAPI へプロキシする構成にした。
- Backend: `uv` ベースの `pyproject.toml` / `uv.lock` に移行し、Docker 内でも lock ベースで依存同期するようにした。
- Backend: Docker 実行時の Windows ホストパスとコンテナ内パスの対応付けを追加。`SPROUT_HOST_ROOT` 配下を `/workspace/html` に bind mount し、UI 表示は Windows パス、内部処理はコンテナパスで扱う。
- Docs: ルート `.env.example` と README に Docker Compose 起動手順、パス設定、公開ポート設定を追加。

## 2026-06-28

- Backend: Gemini連携サービス(ai_service)を追加。HTMLゼロ生成・全体編集・部分編集・画像生成(nanobanana2)を提供。APIキー/モデル呼び出しはバックエンドに集約。
- Backend: AI用API(`/api/ai/generate` `/api/ai/edit` `/api/ai/edit-fragment` `/api/ai/image` `/api/ai/status`)を追加。
- Backend: 生成画像のハイブリッド埋め込み(編集中ファイル近傍へ保存し相対参照 / 未保存時は data URI)を file_service に追加。
- Backend: 依存に google-genai / python-dotenv を追加し、`.env` 読み込みと `.env.example` を整備。
- Frontend: AIアシスタント(モーダル)を追加。ツールバーの「✨ AI」から生成・編集・画像生成を実行。配色は既存の `--sprout-*` パレットで統一。
- Frontend: EditorEngine に AI連携(選択要素の取得・置換、画像挿入)を追加。

## 2026-06-27

- Frontend: HTMLプレビューを疑似全画面表示に切り替えるツールバーボタンを追加。
- Frontend: 全画面表示中は上部ツールバーを非表示にする。
- Frontend: iframe内にフォーカスがある場合でもEscで全画面表示を解除できるようにする。
- Backend: HTMLファイル操作のC:\Users\winni配下制限を撤廃し、絶対パス指定で任意場所を開けるようにする。
