// ファイルを開く/保存するユースケース。
// API(infrastructure)とエンジン(state/editorController)を協調させ、
// UIに依存しない処理としてまとめる。

import { fileApi, buildAssetBaseHref } from '../../infrastructure/api/fileApi'
import { ApiError } from '../../infrastructure/api/client'
import { getEngine } from '../../state/editorController'
import {
  clientFileHandleStore,
  currentClientFileNameStore,
  currentFileStore,
  setStatus,
} from '../../state/stores/editorStore'
import { get } from 'svelte/store'

interface HtmlSaveFilePickerOptions {
  suggestedName?: string
  types?: Array<{
    description: string
    accept: Record<string, string[]>
  }>
  excludeAcceptAllOption?: boolean
}

type FilePickerWindow = Window &
  typeof globalThis & {
    showSaveFilePicker?: (options?: HtmlSaveFilePickerOptions) => Promise<FileSystemFileHandle>
  }

const HTML_FILE_TYPES = [
  {
    description: 'HTML files',
    accept: { 'text/html': ['.html', '.htm'] },
  },
]

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
    currentClientFileNameStore.set(null)
    clientFileHandleStore.set(null)
    setStatus('success', `開きました: ${path}`)
  } catch (e) {
    setStatus('error', e instanceof ApiError ? e.message : 'ファイルを開けませんでした')
  }
}

/** クライアントPC側で選択されたHTMLファイルを読み込む。Web標準では元ファイルの絶対パスは取得できない。 */
export async function openClientHtmlFile(
  file: File,
  handle: FileSystemFileHandle | null = null,
): Promise<void> {
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
    await engine.mount(content, '')
    currentFileStore.set(null)
    currentClientFileNameStore.set(file.name)
    clientFileHandleStore.set(handle)
    setStatus(
      'success',
      handle ? `開きました: ${file.name}` : `開きました: ${file.name}（上書き保存には名前を付けて保存を使ってください）`,
    )
  } catch {
    setStatus('error', '選択されたファイルを開けませんでした')
  }
}

/** ブラウザへドロップされたHTMLファイルを読み込む。 */
export async function openDroppedHtmlFile(file: File): Promise<void> {
  await openClientHtmlFile(file)
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
    currentClientFileNameStore.set(null)
    clientFileHandleStore.set(null)
    setStatus('success', `保存しました: ${savedPath}`)
  } catch (e) {
    setStatus('error', e instanceof ApiError ? e.message : '保存に失敗しました')
  }
}

async function saveCurrentContentToClientFile(handle: FileSystemFileHandle): Promise<void> {
  const engine = getEngine()
  if (!engine) return
  try {
    const writable = await handle.createWritable()
    await writable.write(engine.serialize())
    await writable.close()
    engine.markSaved()
    currentFileStore.set(null)
    currentClientFileNameStore.set(handle.name)
    clientFileHandleStore.set(handle)
    setStatus('success', `保存しました: ${handle.name}`)
  } catch (e) {
    setStatus('error', e instanceof Error ? e.message : 'クライアントPCへの保存に失敗しました')
  }
}

function downloadCurrentContent(filename: string): void {
  const engine = getEngine()
  if (!engine) return
  const blob = new Blob([engine.serialize()], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  engine.markSaved()
  currentFileStore.set(null)
  currentClientFileNameStore.set(filename)
  clientFileHandleStore.set(null)
  setStatus('success', `ダウンロード保存しました: ${filename}`)
}

function getSuggestedFileName(): string {
  const clientName = get(currentClientFileNameStore)
  if (clientName) return clientName

  const serverPath = get(currentFileStore)
  if (serverPath) {
    const parts = serverPath.replaceAll('\\', '/').split('/')
    return parts.at(-1) || 'page.html'
  }
  return 'page.html'
}

function canSaveCurrentContent(): boolean {
  const engine = getEngine()
  if (!engine) {
    setStatus('error', 'エディタが初期化されていません')
    return false
  }
  if (!engine.serialize().trim()) {
    setStatus('error', '保存するページがありません')
    return false
  }
  return true
}

/** 保存先へ上書き保存する。保存先未設定時はエラーとする。 */
export async function saveCurrentFileOverwrite(): Promise<void> {
  if (!canSaveCurrentContent()) return

  const clientHandle = get(clientFileHandleStore)
  if (clientHandle) {
    await saveCurrentContentToClientFile(clientHandle)
    return
  }

  const path = get(currentFileStore)
  if (!path) {
    setStatus('error', '保存先が未設定です。「名前を付けて保存」を使ってください')
    return
  }

  await saveCurrentFile(path)
}

/** クライアントPC側で保存先を指定して保存する。 */
export async function saveCurrentFileAs(): Promise<void> {
  if (!canSaveCurrentContent()) return

  const suggestedName = getSuggestedFileName()
  const pickerWindow = window as FilePickerWindow
  if (!pickerWindow.showSaveFilePicker) {
    downloadCurrentContent(suggestedName)
    return
  }

  try {
    const handle = await pickerWindow.showSaveFilePicker({
      suggestedName,
      types: HTML_FILE_TYPES,
      excludeAcceptAllOption: false,
    })
    await saveCurrentContentToClientFile(handle)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return
    setStatus('error', e instanceof Error ? e.message : '保存ダイアログを開けませんでした')
  }
}

/** ショートカット用。保存先があれば上書き、なければ名前を付けて保存。 */
export async function saveCurrentFileFromShortcut(): Promise<void> {
  if (get(currentFileStore) || get(clientFileHandleStore)) {
    await saveCurrentFileOverwrite()
  } else {
    await saveCurrentFileAs()
  }
}
