/** ファイルパスを URL 用に正規化する。 */
function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

/** 指定HTMLファイルのディレクトリを基点にした、アセット配信用 base href を組み立てる。 */
export function buildAssetBaseHref(filePath: string): string {
  const normalized = normalizeFilePath(filePath)
  const dir = normalized.slice(0, normalized.lastIndexOf('/'))
  // 末尾スラッシュ必須(相対参照が dir 配下に解決されるように)。
  return `/assets/${encodeURI(dir)}/`
}

/** 編集中HTMLと相対アセットパスから、バックエンド配信用 URL を組み立てる。 */
export function buildAssetFileUrl(htmlFilePath: string, relativeAssetPath: string): string {
  const normalized = normalizeFilePath(htmlFilePath)
  const dir = normalized.slice(0, normalized.lastIndexOf('/'))
  const assetPath = relativeAssetPath.replace(/^\.\//, '')
  return `/assets/${encodeURI(`${dir}/${assetPath}`)}`
}
