// ファイルを開く/保存するユースケース。
// API(infrastructure)とエンジン(state/editorController)を協調させ、
// UIに依存しない処理としてまとめる。

import { fileApi, buildAssetBaseHref } from '../../infrastructure/api/fileApi'
import { ApiError } from '../../infrastructure/api/client'
import { getEngine } from '../../state/editorController'
import { currentFileStore, setStatus } from '../../state/stores/editorStore'

/** 指定HTMLファイルを開いてプレビューに読み込む。 */
export async function openFile(path: string): Promise<void> {
  const engine = getEngine()
  if (!engine) {
    setStatus('error', 'エディタが初期化されていません')
    return
  }
  try {
    const { content } = await fileApi.readFile(path)
    const baseHref = buildAssetBaseHref(path)
    await engine.mount(content, baseHref)
    currentFileStore.set(path)
    setStatus('success', `開きました: ${path}`)
  } catch (e) {
    setStatus('error', e instanceof ApiError ? e.message : 'ファイルを開けませんでした')
  }
}

/** 現在の編集内容を保存する。 */
export async function saveCurrentFile(path: string): Promise<void> {
  const engine = getEngine()
  if (!engine) return
  try {
    const html = engine.serialize()
    await fileApi.saveFile(path, html)
    engine.markSaved()
    setStatus('success', `保存しました: ${path}`)
  } catch (e) {
    setStatus('error', e instanceof ApiError ? e.message : '保存に失敗しました')
  }
}
