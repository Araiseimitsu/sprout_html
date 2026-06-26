# Sprout HTML — 設計ドキュメント

## 1. 目的
任意のHTMLファイルを、UI上で直感的に編集できるローカルWebアプリ。
「誰でも簡単に気軽に」編集できることを目指しつつ、構造ごと組み替えられるプロレベルの編集を提供する。

最重要要件: **任意のHTMLを開いても、元の構造・CSS・スクリプトを壊さずに保存できること。**

## 2. 構成（責務分離）
| 層 | 技術 | 責務 |
|---|---|---|
| backend | FastAPI | ファイル一覧/読み込み/保存、対象ディレクトリのアセット配信、バックアップ |
| frontend | Svelte + Vite (SPA) | UI全般、編集エンジン、状態管理。サーバー処理は持たない |

- API・ファイルI/O・保存ロジックは **FastAPI に正本を固定**（SvelteKit のサーバー機能は使わず二重化を回避）。
- フロントは `infrastructure/api` 経由でのみ通信し、`.svelte` から直接 `fetch` しない。

## 3. 編集エンジン: ライブDOM方式
- 開いたHTMLテキストを取得 → `<base href>`（バックエンドのアセット配信URL）と編集ランタイムを注入し、ページ側 `<script>` は実行無効化した上で iframe の `srcdoc` に設定。
- iframe は同一オリジン(about:srcdoc)となり、`contentDocument` を直接操作可能。CSS/画像は `<base>` によりバックエンドから解決。
- 選択・テキスト編集・スタイル/属性変更・要素の追加削除・並び替えは、すべて iframe 内の生きたDOMを直接操作する。
- 保存時は、注入物（base/編集ランタイム/選択オーバーレイ）を除去し、無効化したスクリプトを復元 → 整形してHTML文字列化 → バックエンドへ送信し上書き（事前に `.bak` バックアップ）。

## 4. 主要コンポーネント（frontend）
レイヤー構成は `.docs/frontend-svelte.md` に準拠（plain Svelte + Vite なので `main.ts` 起点）。

```
frontend/src/
├─ lib/
│  ├─ presentation/components/   # FileOpener, EditorCanvas, ElementTree, PropertiesPanel, Toolbar
│  ├─ state/stores/              # documentStore, selectionStore, historyStore
│  ├─ application/usecases/      # openFile, saveFile, applyStyle, applyAttribute, addElement, deleteElement, moveElement
│  ├─ infrastructure/
│  │  ├─ api/                    # client.ts, fileApi.ts, endpoints.ts
│  │  └─ editor/                 # iframe注入・シリアライズ・DOM操作・オーバーレイ
│  └─ shared/                    # types, constants, utils
└─ main.ts / App.svelte
```

### UIレイアウト（ビジュアル中心型）
- 上部: Toolbar（開く / 保存 / Undo / Redo / 要素追加・削除）
- 左: ElementTree（DOMツリー、クリックで選択）
- 中央: EditorCanvas（iframeプレビュー＋選択オーバーレイ）
- 右: PropertiesPanel（スタイル・属性編集）

## 5. 状態管理（store）
- `documentStore`: 現在のファイルパス、編集中DOMの参照、dirtyフラグ
- `selectionStore`: 選択中の要素（iframe内）への参照とそのパス
- `historyStore`: Undo/Redo 用のHTMLスナップショットスタック

## 6. バックエンドAPI
| メソッド | パス | 役割 |
|---|---|---|
| GET | `/api/browse?path=` | ディレクトリ/ファイル一覧（ファイルピッカー用） |
| GET | `/api/file?path=` | HTMLテキスト取得（編集対象） |
| POST | `/api/file` | HTML上書き保存（`.bak`バックアップ後に書き込み） |
| GET | `/assets/{...}` | 対象ファイルのディレクトリを基点にアセット配信 |

破壊的操作（上書き）は必ずバックアップを取り、対象パスを検証する（指定ルート外は拒否）。

## 7. 編集操作（MVP対象=全7種）
1. クリック選択（プレビュー/ツリー両方）
2. テキスト直接編集（contenteditable）
3. スタイル変更（color/font-size/margin/padding 等をパネルで）
4. 要素の追加・削除
5. ドラッグ&ドロップで移動・並び替え
6. 属性編集（class/id/href/src 等）
7. Undo/Redo（スナップショット方式）

## 8. エラーハンドリング/ログ
- バックエンドは info/warn/error を使い分けてログ出力。保存失敗・パス不正は明示的にエラー応答。
- フロントは API エラーを infrastructure/api で一元処理し、UI にトースト等で通知。

## 9. テスト方針
- application 層のusecase、シリアライズ/DOM操作ユーティリティ、バリデーションを優先的にテスト。
- 純粋なUI表示はテスト必須としない。

## 10. 起動方法（MVP）
- backend: `uvicorn app.main:app --reload`（ポート8000）
- frontend: `pnpm dev`（Vite, ポート5173。`/api`・`/assets` は backend にプロキシ）
