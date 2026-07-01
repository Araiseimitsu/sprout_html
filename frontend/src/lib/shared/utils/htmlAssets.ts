/** HTML 内の相対参照アセット(img 等)を収集する。 */

/** ZIP エクスポート時の画像サブディレクトリ(バックエンド SPROUT_IMAGE_DIR 既定値と揃える)。 */
export const EXPORT_IMAGE_DIR = 'sprout-images'

const REMOTE_SRC_PATTERN = /^(?:data:|https?:|\/\/|\/)/i
const IMG_SRC_PATTERN = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi

/** 保存用 HTML から、同梱すべき相対パスのアセット参照を重複なく返す。 */
export function collectRelativeAssetPaths(html: string): string[] {
  const paths = new Set<string>()

  for (const match of html.matchAll(IMG_SRC_PATTERN)) {
    const src = match[1]?.trim()
    if (!src || REMOTE_SRC_PATTERN.test(src)) continue
    paths.add(normalizeRelativeAssetPath(src))
  }

  return [...paths]
}

/** 保存用 HTML とライブ DOM から img の src を重複なく集める。 */
export function collectImageSources(html: string, liveDoc: Document | null): string[] {
  const sources = new Set<string>()

  for (const match of html.matchAll(IMG_SRC_PATTERN)) {
    const src = match[1]?.trim()
    if (src) sources.add(src)
  }

  liveDoc?.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src')?.trim()
    if (src) sources.add(src)
  })

  return [...sources]
}

/** HTML 内の img src を ZIP 用の相対パスへ差し替える。 */
export function rewriteHtmlImageSources(html: string, rewrites: Map<string, string>): string {
  let result = html
  const entries = [...rewrites.entries()].sort((a, b) => b[0].length - a[0].length)
  for (const [from, to] of entries) {
    result = result.split(from).join(to)
  }
  return result
}

function normalizeRelativeAssetPath(src: string): string {
  return src.replace(/^\.\//, '').replace(/\\/g, '/')
}

export { normalizeRelativeAssetPath }
