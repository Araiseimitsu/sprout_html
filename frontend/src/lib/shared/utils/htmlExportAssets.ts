/** HTML / ライブ DOM から画像を収集し、ZIP 同梱用バイナリへ解決する。 */

import { EXPORT_IMAGE_DIR, collectImageSources, normalizeRelativeAssetPath, rewriteHtmlImageSources } from './htmlAssets'
import { buildAssetFileUrl } from './assetPath'

const DATA_URI_PATTERN = /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/i
const ASSETS_PATH_PREFIX = '/assets/'

export interface PreparedExportAsset {
  zipPath: string
  data: ArrayBuffer
}

export interface PreparedHtmlExport {
  html: string
  assets: PreparedExportAsset[]
  missing: string[]
}

function relativePathFromHtmlDir(htmlFilePath: string, absolutePath: string): string {
  const htmlDir = normalizeFilePath(htmlFilePath).slice(0, normalizeFilePath(htmlFilePath).lastIndexOf('/'))
  const normalizedAbsolute = normalizeFilePath(absolutePath)
  if (normalizedAbsolute.toLowerCase().startsWith(`${htmlDir.toLowerCase()}/`)) {
    return normalizedAbsolute.slice(htmlDir.length + 1)
  }
  return `${EXPORT_IMAGE_DIR}/${fileNameFromPath(normalizedAbsolute)}`
}

function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

function fileNameFromPath(filePath: string): string {
  const parts = normalizeFilePath(filePath).split('/')
  return parts.at(-1) || 'image.png'
}

function parseAssetsUrlPath(src: string): string | null {
  let pathname = src
  try {
    if (/^https?:/i.test(src)) {
      pathname = new URL(src).pathname
    }
  } catch {
    return null
  }
  if (!pathname.startsWith(ASSETS_PATH_PREFIX)) return null
  return decodeURI(pathname.slice(ASSETS_PATH_PREFIX.length))
}

function toFetchUrl(src: string): string {
  if (/^https?:/i.test(src)) return src
  if (src.startsWith('//')) return `${window.location.protocol}${src}`
  if (src.startsWith('/')) return src
  return src
}

function extensionFromMime(mime: string): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg'
  if (mime.includes('webp')) return '.webp'
  if (mime.includes('gif')) return '.gif'
  if (mime.includes('svg')) return '.svg'
  return '.png'
}

function dataUriToArrayBuffer(dataUri: string): { mime: string; data: ArrayBuffer } | null {
  const match = DATA_URI_PATTERN.exec(dataUri)
  if (!match) return null

  const mime = match[1] || 'image/png'
  const payload = match[3]
  if (match[2]) {
    const binary = atob(payload)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return { mime, data: bytes.buffer }
  }

  const decoded = decodeURIComponent(payload)
  const bytes = new TextEncoder().encode(decoded)
  return { mime, data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }
}

function isExternalRemoteImage(src: string): boolean {
  if (src.startsWith('data:') || src.startsWith(ASSETS_PATH_PREFIX)) return false
  if (!/^https?:\/\//i.test(src)) return false
  try {
    const url = new URL(src)
    return url.origin !== window.location.origin
  } catch {
    return true
  }
}

async function fetchBinary(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(toFetchUrl(url))
    if (!response.ok) return null
    return await response.arrayBuffer()
  } catch {
    return null
  }
}

async function resolveImageSource(
  src: string,
  htmlFilePath: string | null,
  embeddedIndex: number,
): Promise<{ zipPath: string; data: ArrayBuffer } | null> {
  if (src.startsWith('data:')) {
    const parsed = dataUriToArrayBuffer(src)
    if (!parsed) return null
    return {
      zipPath: `${EXPORT_IMAGE_DIR}/embedded-${embeddedIndex}${extensionFromMime(parsed.mime)}`,
      data: parsed.data,
    }
  }

  const assetsPath = parseAssetsUrlPath(src)
  if (assetsPath) {
    const data = await fetchBinary(src)
    if (!data) return null
    const zipPath = htmlFilePath
      ? relativePathFromHtmlDir(htmlFilePath, assetsPath)
      : `${EXPORT_IMAGE_DIR}/${fileNameFromPath(assetsPath)}`
    return { zipPath, data }
  }

  if (!/^(?:https?:|\/\/|\/)/i.test(src)) {
    if (!htmlFilePath) return null
    const relativePath = normalizeRelativeAssetPath(src)
    const data = await fetchBinary(buildAssetFileUrl(htmlFilePath, relativePath))
    if (!data) return null
    return { zipPath: relativePath, data }
  }

  return null
}

function registerRewrite(rewrites: Map<string, string>, from: string, to: string): void {
  if (!from || from === to) return
  rewrites.set(from, to)
}

/** HTML と画像バイナリを ZIP 同梱用に準備する。 */
export async function prepareHtmlExportBundle(
  html: string,
  liveDoc: Document | null,
  htmlFilePath: string | null,
): Promise<PreparedHtmlExport> {
  const sources = collectImageSources(html, liveDoc)
  const assetsByPath = new Map<string, ArrayBuffer>()
  const rewrites = new Map<string, string>()
  const missing: string[] = []
  let embeddedIndex = 0

  for (const src of sources) {
    if (isExternalRemoteImage(src)) continue

    const resolved = await resolveImageSource(src, htmlFilePath, embeddedIndex)
    if (!resolved) {
      missing.push(src)
      continue
    }

    if (src.startsWith('data:')) embeddedIndex += 1
    assetsByPath.set(resolved.zipPath, resolved.data)
    registerRewrite(rewrites, src, resolved.zipPath)

    const assetsPath = parseAssetsUrlPath(src)
    if (assetsPath && htmlFilePath) {
      registerRewrite(rewrites, normalizeRelativeAssetPath(relativePathFromHtmlDir(htmlFilePath, assetsPath)), resolved.zipPath)
    }
  }

  return {
    html: rewriteHtmlImageSources(html, rewrites),
    assets: [...assetsByPath.entries()].map(([zipPath, data]) => ({ zipPath, data })),
    missing,
  }
}
