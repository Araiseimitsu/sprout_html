// 開いたHTMLを「編集可能なプレビュー用」に整形する処理。
//
// やること:
//  1. 全要素に一意IDを付与 (ツリーと実DOMの対応づけ)
//  2. ページ側スクリプトを実行無効化 (編集中の暴走防止。保存時に復元)
//  3. <base href> を注入 (相対参照のCSS/画像をバックエンド経由で解決)
//  4. 編集用スタイル(ホバー/選択の枠線)を注入
//
// 注入物はすべて印(SPROUT_INJECTED_ATTR)を付け、保存時のシリアライズで除去する。

import {
  SPROUT_ID_ATTR,
  SPROUT_INJECTED_ATTR,
  SPROUT_SCRIPT_ATTRS_ATTR,
  SPROUT_SCRIPT_PLACEHOLDER_ATTR,
} from '../../shared/constants/editor'

// 編集中だけ有効なスタイル。ホバーと選択を視覚化する。
const EDITOR_CSS = `
html, body { overflow-y: auto !important; min-height: 100% !important; }
[${SPROUT_ID_ATTR}]:hover { outline: 1px dashed #7eb896 !important; outline-offset: -1px; cursor: default; }
[data-sprout-selected] { outline: 2px solid #4f8a6b !important; outline-offset: -2px; }
[contenteditable="true"] { outline: 2px solid #2f6f50 !important; }
`

/** 要素に連番IDを振る。doc全体を走査する。 */
function assignIds(doc: Document): void {
  let counter = 0
  const all = doc.documentElement.querySelectorAll('*')
  all.forEach((el) => {
    if (el.hasAttribute(SPROUT_SCRIPT_PLACEHOLDER_ATTR)) return
    el.setAttribute(SPROUT_ID_ATTR, `s${counter++}`)
  })
}

/** ページ側スクリプトを template へ退避し、編集 iframe で実行されないようにする。 */
function neutralizeScripts(doc: Document): void {
  doc.querySelectorAll('script').forEach((script) => {
    const placeholder = doc.createElement('template')
    const attrs = Array.from(script.attributes).map((attr) => [attr.name, attr.value])
    placeholder.setAttribute(SPROUT_SCRIPT_PLACEHOLDER_ATTR, '')
    placeholder.setAttribute(SPROUT_SCRIPT_ATTRS_ATTR, JSON.stringify(attrs))
    placeholder.content.append(doc.createTextNode(script.textContent ?? ''))
    script.replaceWith(placeholder)
  })
}

/** <base> と編集用スタイルを head に注入する。 */
function injectEditorAssets(doc: Document, assetBaseHref: string): void {
  let head = doc.head
  if (!head) {
    head = doc.createElement('head')
    doc.documentElement.prepend(head)
  }

  const base = doc.createElement('base')
  base.setAttribute('href', assetBaseHref)
  base.setAttribute(SPROUT_INJECTED_ATTR, 'base')
  head.prepend(base)

  const style = doc.createElement('style')
  style.setAttribute(SPROUT_INJECTED_ATTR, 'style')
  style.textContent = EDITOR_CSS
  head.appendChild(style)
}

function toAssetRelativeUrl(value: string, assetBaseHref: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return value
  return new URL(value.slice(1), assetBaseHref).toString()
}

/** root-relative な静的アセット参照を、編集中HTMLのディレクトリ基準へ寄せる。 */
function rewriteRootRelativeAssets(doc: Document, assetBaseHref: string): void {
  const targets = [
    ['script[src]', 'src'],
    ['link[href]', 'href'],
    ['img[src]', 'src'],
    ['source[src]', 'src'],
    ['video[src]', 'src'],
    ['audio[src]', 'src'],
    ['track[src]', 'src'],
  ] as const

  targets.forEach(([selector, attr]) => {
    doc.querySelectorAll(selector).forEach((el) => {
      const value = el.getAttribute(attr)
      if (value) el.setAttribute(attr, toAssetRelativeUrl(value, assetBaseHref))
    })
  })
}

/** 実行プレビュー内のページ側API呼び出しが、Sprout自身の /api と衝突しないようにする。 */
function injectRuntimeNetworkGuard(doc: Document, assetBaseHref: string): void {
  let head = doc.head
  if (!head) {
    head = doc.createElement('head')
    doc.documentElement.prepend(head)
  }

  const script = doc.createElement('script')
  script.textContent = `
;(() => {
  const assetBaseHref = ${JSON.stringify(assetBaseHref)}
  const toPreviewUrl = (value) => {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return value
    return new URL(value.slice(1), assetBaseHref).toString()
  }
  const originalFetch = window.fetch?.bind(window)
  if (originalFetch) {
    window.fetch = (input, init) => {
      if (typeof input === 'string') return originalFetch(toPreviewUrl(input), init)
      if (input instanceof Request) {
        const url = new URL(input.url)
        if (url.protocol === 'http:' || url.protocol === 'https:') return originalFetch(input, init)
        return originalFetch(new Request(toPreviewUrl(url.pathname + url.search + url.hash), input), init)
      }
      return originalFetch(input, init)
    }
  }
  const originalOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    return originalOpen.call(this, method, toPreviewUrl(url), ...rest)
  }
})()
`
  head.prepend(script)
}

/** 実行プレビュー用に <base> と最小限の実行補助だけを注入する。ページ側 script はそのまま実行させる。 */
function injectRuntimeBase(doc: Document, assetBaseHref: string): void {
  let head = doc.head
  if (!head) {
    head = doc.createElement('head')
    doc.documentElement.prepend(head)
  }

  const base = doc.createElement('base')
  base.setAttribute('href', assetBaseHref)
  head.prepend(base)
}

/**
 * 生HTMLを、編集プレビュー用 srcdoc 文字列へ変換する。
 * @param rawHtml 元のHTML文字列
 * @param assetBaseHref アセット配信のbase href
 */
export function prepareSrcdoc(rawHtml: string, assetBaseHref: string): string {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
  neutralizeScripts(doc)
  assignIds(doc)
  injectEditorAssets(doc, assetBaseHref)
  const doctype = doc.doctype ? '<!DOCTYPE html>\n' : ''
  return doctype + doc.documentElement.outerHTML
}

/** 生HTMLを、script 有効の読み取り専用実行プレビュー srcdoc へ変換する。 */
export function prepareRuntimeSrcdoc(rawHtml: string, assetBaseHref: string): string {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
  const runtimeAssetBaseHref = new URL(assetBaseHref, window.location.origin).toString()
  rewriteRootRelativeAssets(doc, runtimeAssetBaseHref)
  injectRuntimeNetworkGuard(doc, runtimeAssetBaseHref)
  injectRuntimeBase(doc, runtimeAssetBaseHref)
  const doctype = doc.doctype ? '<!DOCTYPE html>\n' : ''
  return doctype + doc.documentElement.outerHTML
}
