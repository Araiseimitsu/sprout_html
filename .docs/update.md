# Update Log

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
