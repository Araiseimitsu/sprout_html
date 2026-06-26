// iframe内のライブDOMから、UI表示用の要素ツリー(TreeNode)を構築する。

import { SPROUT_ID_ATTR } from '../../shared/constants/editor'
import type { TreeNode } from '../../shared/types'

/** 要素から短いテキストプレビューを取り出す(直下テキストのみ、長すぎる場合は省略)。 */
function textPreview(el: Element): string {
  let text = ''
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? ''
  })
  text = text.trim().replace(/\s+/g, ' ')
  return text.length > 30 ? text.slice(0, 30) + '…' : text
}

/** 1要素をTreeNodeへ変換する(再帰)。 */
function toNode(el: Element): TreeNode {
  const children: TreeNode[] = []
  Array.from(el.children).forEach((child) => {
    // 編集エンジンが注入した要素はツリーに出さない。
    if (child.hasAttribute(SPROUT_ID_ATTR)) {
      children.push(toNode(child))
    }
  })
  return {
    id: el.getAttribute(SPROUT_ID_ATTR) ?? '',
    tag: el.tagName.toLowerCase(),
    className: el.getAttribute('class') ?? '',
    textPreview: textPreview(el),
    children,
  }
}

/**
 * body要素を起点にツリーを構築する。
 * @returns body直下の子ノード配列
 */
export function buildTree(doc: Document): TreeNode[] {
  const body = doc.body
  if (!body) return []
  return Array.from(body.children)
    .filter((el) => el.hasAttribute(SPROUT_ID_ATTR))
    .map((el) => toNode(el))
}
