// 編集中のライブDOMを、保存用のクリーンなHTML文字列へ戻す処理。
//
// やること(prepareSrcdocの逆):
//  1. 注入した base/style を除去
//  2. 無効化したスクリプトのtypeを元に戻す
//  3. 編集用の印(ID, selected属性等)を全要素から除去
//  4. doctype付きで文字列化
//
// 元のテキストノード(改行・インデント)はDOMに保持されるため、概ね元の整形が保たれる。

import {
  DISABLED_SCRIPT_TYPE,
  SPROUT_ID_ATTR,
  SPROUT_INJECTED_ATTR,
  SPROUT_SCRIPT_TYPE_ATTR,
} from '../../shared/constants/editor'

const SELECTED_ATTR = 'data-sprout-selected'

/**
 * ライブDocumentを複製し、編集用要素を取り除いた保存用HTMLを返す。
 * 元のDocumentは変更しない(複製に対して操作する)。
 */
export function serializeForSave(liveDoc: Document): string {
  // 複製して破壊的変更を元DOMに波及させない。
  const doc = liveDoc.cloneNode(true) as Document

  // 1. 注入物を除去
  doc.querySelectorAll(`[${SPROUT_INJECTED_ATTR}]`).forEach((el) => el.remove())

  // 2. スクリプトtype復元
  doc.querySelectorAll(`script[${SPROUT_SCRIPT_TYPE_ATTR}]`).forEach((script) => {
    const original = script.getAttribute(SPROUT_SCRIPT_TYPE_ATTR) ?? ''
    if (original === '') {
      script.removeAttribute('type')
    } else {
      script.setAttribute('type', original)
    }
    script.removeAttribute(SPROUT_SCRIPT_TYPE_ATTR)
  })

  // 3. 編集用の印を全除去
  doc.querySelectorAll(`[${SPROUT_ID_ATTR}]`).forEach((el) => el.removeAttribute(SPROUT_ID_ATTR))
  doc.querySelectorAll(`[${SELECTED_ATTR}]`).forEach((el) => el.removeAttribute(SELECTED_ATTR))
  doc
    .querySelectorAll('[contenteditable]')
    .forEach((el) => el.removeAttribute('contenteditable'))

  const doctype = doc.doctype ? '<!DOCTYPE html>\n' : ''
  return doctype + doc.documentElement.outerHTML + '\n'
}
