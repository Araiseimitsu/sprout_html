// ファイルを開く/保存するユースケース。
// API(infrastructure)とエンジン(state/editorController)を協調させ、
// UIに依存しない処理としてまとめる。

import { fileApi, buildAssetBaseHref } from '../../infrastructure/api/fileApi'
import { ApiError } from '../../infrastructure/api/client'
import {
  createHtmlExportZip,
  toZipFileName,
  triggerBlobDownload,
} from '../../infrastructure/export/zipExport'
import { getEngine } from '../../state/editorController'
import { prepareHtmlExportBundle } from '../../shared/utils/htmlExportAssets'
import {
  currentClientFileNameStore,
  currentFileStore,
  setStatus,
} from '../../state/stores/editorStore'
import { get } from 'svelte/store'

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
    setStatus('success', `開きました: ${path}`)
  } catch (e) {
    setStatus('error', e instanceof ApiError ? e.message : 'ファイルを開けませんでした')
  }
}

/** クライアントPC側で選択されたHTMLファイルを読み込む。Web標準では元ファイルの絶対パスは取得できない。 */
export async function openClientHtmlFile(file: File): Promise<void> {
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
    setStatus('success', `開きました: ${file.name}`)
  } catch {
    setStatus('error', '選択されたファイルを開けませんでした')
  }
}

/** ブラウザへドロップされたHTMLファイルを読み込む。 */
export async function openDroppedHtmlFile(file: File): Promise<void> {
  await openClientHtmlFile(file)
}

async function downloadCurrentContentAsZip(htmlFileName: string): Promise<void> {
  const engine = getEngine()
  if (!engine) return

  const html = engine.serialize()
  const serverPath = get(currentFileStore)
  const { html: exportHtml, assets, missing } = await prepareHtmlExportBundle(
    html,
    engine.getLiveDocument(),
    serverPath,
  )
  const zipBlob = await createHtmlExportZip(exportHtml, htmlFileName, assets)
  triggerBlobDownload(zipBlob, toZipFileName(htmlFileName))

  engine.markSaved()
  currentClientFileNameStore.set(htmlFileName)

  const zipName = toZipFileName(htmlFileName)
  if (missing.length > 0) {
    setStatus(
      'error',
      `ZIPをダウンロードしました: ${zipName}（画像 ${assets.length}/${assets.length + missing.length} 件。取得できず: ${missing.join(', ')}）`,
    )
    return
  }
  if (assets.length > 0) {
    setStatus('success', `ZIPをダウンロードしました: ${zipName}（HTML + 画像 ${assets.length} 件）`)
    return
  }
  setStatus('success', `ZIPをダウンロードしました: ${zipName}`)
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

function canDownloadCurrentContent(): boolean {
  const engine = getEngine()
  if (!engine) {
    setStatus('error', 'エディタが初期化されていません')
    return false
  }
  if (!engine.serialize().trim()) {
    setStatus('error', 'ダウンロードするページがありません')
    return false
  }
  return true
}

/** 編集中ページを ZIP (HTML + 画像) でダウンロードする。 */
export async function downloadPageZip(): Promise<void> {
  if (!canDownloadCurrentContent()) return
  await downloadCurrentContentAsZip(getSuggestedFileName())
}
