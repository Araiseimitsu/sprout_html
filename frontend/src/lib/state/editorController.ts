// EditorEngine(infrastructure)とストア(state)を橋渡しするコントローラ。
// エンジンのインスタンスを単一に保持し、状態変化をストアへ反映する。

import { EditorEngine } from '../infrastructure/editor/EditorEngine'
import { dirtyStore, historyStore, selectionStore, treeStore } from './stores/editorStore'

let engine: EditorEngine | null = null

/** iframeを受け取りエンジンを初期化する(EditorCanvasのマウント時に呼ぶ)。 */
export function initEngine(iframe: HTMLIFrameElement): EditorEngine {
  engine = new EditorEngine(iframe, {
    onTreeChange: (tree) => treeStore.set(tree),
    onSelectionChange: (info) => selectionStore.set(info),
    onDirtyChange: (dirty) => dirtyStore.set(dirty),
    onHistoryChange: (canUndo, canRedo) => historyStore.set({ canUndo, canRedo }),
  })
  return engine
}

/** 初期化済みエンジンを返す。未初期化ならnull。 */
export function getEngine(): EditorEngine | null {
  return engine
}
