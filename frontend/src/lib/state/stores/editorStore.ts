// 編集に関わるUI状態のストア群。
// 業務状態(ツリー/選択/dirty/履歴)とファイル状態を分けて保持する。

import { writable } from 'svelte/store'
import type { AiStatus, SelectionInfo, TreeNode } from '../../shared/types'

/** 現在編集中のファイルパス。 */
export const currentFileStore = writable<string | null>(null)

/** ブラウザで開いたクライアントPC側ファイルの名前。 */
export const currentClientFileNameStore = writable<string | null>(null)

/** 要素ツリー(プレビューDOMの軽量表現)。 */
export const treeStore = writable<TreeNode[]>([])

/** 選択中要素の情報(プロパティパネル用)。未選択時はnull。 */
export const selectionStore = writable<SelectionInfo | null>(null)

/** 未保存変更があるか。 */
export const dirtyStore = writable(false)

/** Undo/Redo の可否。 */
export const historyStore = writable<{ canUndo: boolean; canRedo: boolean }>({
  canUndo: false,
  canRedo: false,
})

/** 画面下部などに出すステータス通知。 */
export type StatusKind = 'info' | 'success' | 'error'
export const statusStore = writable<{ kind: StatusKind; message: string } | null>(null)

/** ステータスを設定する補助。 */
export function setStatus(kind: StatusKind, message: string): void {
  statusStore.set({ kind, message })
}

/** AI処理中フラグ(ボタン無効化/スピナー表示用)。 */
export const aiBusyStore = writable(false)

/** AI機能の利用可否(未取得時はnull)。 */
export const aiStatusStore = writable<AiStatus | null>(null)

/** 型の再エクスポート(コンポーネントからの参照用)。 */
export type { SelectionInfo, TreeNode }
