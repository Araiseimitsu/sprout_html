/** 指定HTMLファイルのディレクトリを基点にした、アセット配信用 base href を組み立てる。 */
export function buildAssetBaseHref(filePath: string): string {
  // Windowsパスの区切りを正規化し、ディレクトリ部分を取り出す。
  const normalized = filePath.replace(/\\/g, '/')
  const dir = normalized.slice(0, normalized.lastIndexOf('/'))
  // 末尾スラッシュ必須(相対参照が dir 配下に解決されるように)。
  return `/assets/${encodeURI(dir)}/`
}
