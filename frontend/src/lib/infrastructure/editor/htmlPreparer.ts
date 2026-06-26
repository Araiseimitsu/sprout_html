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
  DISABLED_SCRIPT_TYPE,
  SPROUT_ID_ATTR,
  SPROUT_INJECTED_ATTR,
  SPROUT_SCRIPT_TYPE_ATTR,
} from '../../shared/constants/editor'

// 編集中だけ有効なスタイル。ホバーと選択を視覚化する。
const EDITOR_CSS = `
[${SPROUT_ID_ATTR}]:hover { outline: 1px dashed #7eb896 !important; outline-offset: -1px; cursor: default; }
[data-sprout-selected] { outline: 2px solid #4f8a6b !important; outline-offset: -2px; }
[contenteditable="true"] { outline: 2px solid #2f6f50 !important; }
`

/** 要素に連番IDを振る。doc全体を走査する。 */
function assignIds(doc: Document): void {
  let counter = 0
  const all = doc.documentElement.querySelectorAll('*')
  all.forEach((el) => {
    el.setAttribute(SPROUT_ID_ATTR, `s${counter++}`)
  })
}

/** ページ側スクリプトを実行されないtypeへ退避する(元のtypeは属性に保存)。 */
function neutralizeScripts(doc: Document): void {
  doc.querySelectorAll('script').forEach((script) => {
    const original = script.getAttribute('type') ?? ''
    script.setAttribute(SPROUT_SCRIPT_TYPE_ATTR, original)
    script.setAttribute('type', DISABLED_SCRIPT_TYPE)
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

/**
 * 生HTMLを、編集プレビュー用 srcdoc 文字列へ変換する。
 * @param rawHtml 元のHTML文字列
 * @param assetBaseHref アセット配信のbase href
 */
export function prepareSrcdoc(rawHtml: string, assetBaseHref: string): string {
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
  assignIds(doc)
  neutralizeScripts(doc)
  injectEditorAssets(doc, assetBaseHref)
  const doctype = doc.doctype ? '<!DOCTYPE html>\n' : ''
  return doctype + doc.documentElement.outerHTML
}
