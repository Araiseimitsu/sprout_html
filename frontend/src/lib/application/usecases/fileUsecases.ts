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

/** ブラウザへドロップされたHTMLファイルを読み込む。Web標準では元ファイルの絶対パスは取得できない。 */
export async function openDroppedHtmlFile(file: File): Promise<void> {
  const engine = getEngine()
  if (!engine) {
    setStatus('error', 'エディタが初期化されていません')
    return
  }
  const fileName = file.name.toLowerCase()
  if (!fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
    setStatus('error', 'HTMLファイル(.html/.htm)のみ開けます')
    return
  }
  try {
    const content = await file.text()
    await engine.mount(content, '/assets/')
    currentFileStore.set(null)
    setStatus('success', `開きました: ${file.name}（保存するにはパス指定で開き直してください）`)
  } catch {
    setStatus('error', 'ドロップされたファイルを開けませんでした')
  }
}

/** 現在の編集内容を保存する。保存後は編集中ファイルとして記憶する。 */
export async function saveCurrentFile(path: string): Promise<void> {
  const engine = getEngine()
  if (!engine) return
  try {
    const html = engine.serialize()
    const { path: savedPath } = await fileApi.saveFile(path, html)
    engine.markSaved()
    // 新規保存先(AI生成ページなど)も以後の保存・全画面対象として記憶する。
    currentFileStore.set(savedPath)
    setStatus('success', `保存しました: ${savedPath}`)
  } catch (e) {
    setStatus('error', e instanceof ApiError ? e.message : '保存に失敗しました')
  }
}
