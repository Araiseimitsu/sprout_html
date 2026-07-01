// HTML と相対参照アセットを ZIP にまとめてダウンロードする。

import JSZip from 'jszip'

export interface ZipAssetEntry {
  /** ZIP 内のパス (例: sprout-images/gen-1.png) */
  zipPath: string
  data: ArrayBuffer
}

/** HTML とアセットから ZIP Blob を生成する。 */
export async function createHtmlExportZip(
  html: string,
  htmlFileName: string,
  assets: ZipAssetEntry[],
): Promise<Blob> {
  const zip = new JSZip()
  zip.file(htmlFileName, html)
  for (const asset of assets) {
    zip.file(asset.zipPath, asset.data)
  }
  return zip.generateAsync({ type: 'blob' })
}

/** Blob をブラウザのダウンロードとして保存する。 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** HTML ファイル名から ZIP ファイル名を導出する (page.html → page.zip)。 */
export function toZipFileName(htmlFileName: string): string {
  const base = htmlFileName.replace(/\.html?$/i, '')
  return `${base || 'page'}.zip`
}
