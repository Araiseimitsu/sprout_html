// 編集エンジン本体(ライブDOM方式)。
//
// iframe内のDOMを唯一の正本として、選択・テキスト編集・スタイル/属性変更・
// 要素の追加削除・移動・Undo/Redo を提供する。
// Svelte側へは callbacks 経由で状態変化を通知する(UIに依存しない)。

import { COLOR_STYLE_PROPS, MAX_HISTORY, SPROUT_ID_ATTR } from '../../shared/constants/editor'
import type { SelectionInfo, TreeNode } from '../../shared/types'
import { prepareSrcdoc } from './htmlPreparer'
import { serializeForSave } from './serializer'
import { buildTree } from './treeBuilder'

const SELECTED_ATTR = 'data-sprout-selected'

/** 移動時の挿入位置。 */
export type DropPosition = 'before' | 'after' | 'inside'

export interface EditorCallbacks {
  onTreeChange: (tree: TreeNode[]) => void
  onSelectionChange: (info: SelectionInfo | null) => void
  onDirtyChange: (dirty: boolean) => void
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void
}

export class EditorEngine {
  private iframe: HTMLIFrameElement
  private callbacks: EditorCallbacks
  private selectedId: string | null = null
  private dirty = false
  private undoStack: string[] = []
  private redoStack: string[] = []

  constructor(iframe: HTMLIFrameElement, callbacks: EditorCallbacks) {
    this.iframe = iframe
    this.callbacks = callbacks
  }

  /** HTMLを読み込み、編集可能なプレビューを構築する。 */
  mount(rawHtml: string, assetBaseHref: string): Promise<void> {
    return new Promise((resolve) => {
      const srcdoc = prepareSrcdoc(rawHtml, assetBaseHref)
      const onLoad = () => {
        this.iframe.removeEventListener('load', onLoad)
        this.setupListeners()
        this.resetHistory()
        this.selectedId = null
        this.callbacks.onSelectionChange(null)
        this.refreshTree()
        resolve()
      }
      this.iframe.addEventListener('load', onLoad)
      this.iframe.srcdoc = srcdoc
    })
  }

  // ---- DOMアクセス補助 ----

  private get doc(): Document | null {
    return this.iframe.contentDocument
  }

  private getEl(id: string): Element | null {
    return this.doc?.querySelector(`[${SPROUT_ID_ATTR}="${id}"]`) ?? null
  }

  // ---- イベント設定 ----

  private setupListeners(): void {
    const doc = this.doc
    if (!doc) return
    // クリックで選択。リンク/ボタンの既定動作は抑止(編集中の遷移防止)。
    doc.addEventListener(
      'click',
      (e) => {
        const target = (e.target as Element | null)?.closest(`[${SPROUT_ID_ATTR}]`)
        e.preventDefault()
        e.stopPropagation()
        if (target) this.select(target.getAttribute(SPROUT_ID_ATTR))
      },
      true,
    )
    // ダブルクリックでテキスト直接編集を開始。
    doc.addEventListener('dblclick', (e) => {
      const target = (e.target as Element | null)?.closest(`[${SPROUT_ID_ATTR}]`)
      if (target) this.startTextEdit(target as HTMLElement)
    })
  }

  // ---- 選択 ----

  select(id: string | null): void {
    const doc = this.doc
    if (!doc) return
    doc.querySelectorAll(`[${SELECTED_ATTR}]`).forEach((el) => el.removeAttribute(SELECTED_ATTR))
    this.selectedId = id
    if (id) {
      const el = this.getEl(id)
      el?.setAttribute(SELECTED_ATTR, '')
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
    this.emitSelection()
  }

  private emitSelection(): void {
    if (!this.selectedId) {
      this.callbacks.onSelectionChange(null)
      return
    }
    const el = this.getEl(this.selectedId)
    if (!el) {
      this.callbacks.onSelectionChange(null)
      return
    }
    this.callbacks.onSelectionChange(this.readSelection(el))
  }

  /** 要素から編集パネル用の情報を抽出する。 */
  private readSelection(el: Element): SelectionInfo {
    const attributes: Record<string, string> = {}
    for (const attr of Array.from(el.attributes)) {
      // 編集用の内部属性とstyleは別管理。
      if (attr.name.startsWith('data-sprout') || attr.name === 'style') continue
      if (attr.name === 'contenteditable') continue
      attributes[attr.name] = attr.value
    }
    const styles: Record<string, string> = {}
    const inline = (el as HTMLElement).style
    for (let i = 0; i < inline.length; i++) {
      const prop = inline.item(i)
      styles[prop] = inline.getPropertyValue(prop)
    }
    const computed = this.doc?.defaultView?.getComputedStyle(el)
    const computedColors: Record<string, string> = {}
    if (computed) {
      COLOR_STYLE_PROPS.forEach((prop) => {
        computedColors[prop] = computed.getPropertyValue(prop)
      })
    }
    let directText = ''
    el.childNodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) directText += n.textContent ?? ''
    })
    return {
      id: this.selectedId as string,
      tag: el.tagName.toLowerCase(),
      attributes,
      styles,
      computedColors,
      textContent: directText.trim(),
    }
  }

  // ---- テキスト編集 ----

  private startTextEdit(el: HTMLElement): void {
    this.beginChange()
    this.select(el.getAttribute(SPROUT_ID_ATTR))
    el.setAttribute('contenteditable', 'true')
    el.focus()
    const onBlur = () => {
      el.removeAttribute('contenteditable')
      el.removeEventListener('blur', onBlur)
      this.markDirty()
      this.refreshTree()
      this.emitSelection()
    }
    el.addEventListener('blur', onBlur)
  }

  // ---- スタイル/属性編集 ----

  setStyle(prop: string, value: string): void {
    const el = this.requireSelected()
    if (!el) return
    this.beginChange()
    if (value.trim() === '') {
      ;(el as HTMLElement).style.removeProperty(prop)
    } else {
      ;(el as HTMLElement).style.setProperty(prop, value)
    }
    this.markDirty()
    this.emitSelection()
  }

  setAttribute(name: string, value: string): void {
    const el = this.requireSelected()
    if (!el || name.startsWith('data-sprout')) return
    this.beginChange()
    el.setAttribute(name, value)
    this.markDirty()
    this.refreshTree()
    this.emitSelection()
  }

  removeAttribute(name: string): void {
    const el = this.requireSelected()
    if (!el || name.startsWith('data-sprout')) return
    this.beginChange()
    el.removeAttribute(name)
    this.markDirty()
    this.refreshTree()
    this.emitSelection()
  }

  // ---- 要素の追加/削除 ----

  /** 選択要素の子末尾に新規要素を追加する。未選択時はbody末尾。 */
  addElement(tag: string): void {
    const doc = this.doc
    if (!doc) return
    this.beginChange()
    const el = doc.createElement(tag)
    el.setAttribute(SPROUT_ID_ATTR, this.nextId())
    // 体裁のため、空要素に最小限の中身を入れる。
    if (tag === 'img') {
      el.setAttribute('src', '')
      el.setAttribute('alt', 'image')
    } else if (tag === 'a') {
      el.setAttribute('href', '#')
      el.textContent = 'リンク'
    } else if (!['ul', 'ol', 'div', 'span'].includes(tag)) {
      el.textContent = tag.toUpperCase()
    }
    const parent = this.selectedId ? this.getEl(this.selectedId) : doc.body
    ;(parent ?? doc.body).appendChild(el)
    this.markDirty()
    this.refreshTree()
    this.select(el.getAttribute(SPROUT_ID_ATTR))
  }

  /** 選択要素を削除する。 */
  deleteSelected(): void {
    const el = this.requireSelected()
    if (!el) return
    this.beginChange()
    el.remove()
    this.selectedId = null
    this.markDirty()
    this.refreshTree()
    this.callbacks.onSelectionChange(null)
  }

  // ---- AI連携(断片取得/置換/画像挿入) ----

  /** 選択要素の編集用属性を除いた outerHTML を返す(AI部分編集の入力)。 */
  getSelectedOuterHtml(): string | null {
    const el = this.requireSelected()
    if (!el) return null
    const clone = el.cloneNode(true) as Element
    this.stripEditorAttrs(clone)
    return clone.outerHTML
  }

  /** 選択要素を、AIが返したHTML断片で置き換える(Undo可能)。 */
  replaceSelected(fragmentHtml: string): boolean {
    const doc = this.doc
    const el = this.requireSelected()
    const parent = el?.parentElement
    if (!doc || !el || !parent) return false

    const template = doc.createElement('template')
    template.innerHTML = fragmentHtml.trim()
    const newElements = Array.from(template.content.children)
    if (newElements.length === 0) return false

    this.beginChange()
    newElements.forEach((node) => this.assignIdsTo(node))
    newElements.forEach((node) => parent.insertBefore(node, el))
    el.remove()

    this.markDirty()
    this.refreshTree()
    this.select(newElements[0].getAttribute(SPROUT_ID_ATTR))
    return true
  }

  /** 画像要素を選択要素配下(未選択時はbody末尾)へ挿入する(Undo可能)。 */
  insertImage(src: string, alt: string): void {
    const doc = this.doc
    if (!doc) return
    this.beginChange()
    const img = doc.createElement('img')
    img.setAttribute('src', src)
    img.setAttribute('alt', alt)
    img.setAttribute('style', 'max-width: 100%; height: auto;')
    img.setAttribute(SPROUT_ID_ATTR, this.nextId())
    const parent = this.selectedId ? this.getEl(this.selectedId) : doc.body
    ;(parent ?? doc.body).appendChild(img)
    this.markDirty()
    this.refreshTree()
    this.select(img.getAttribute(SPROUT_ID_ATTR))
  }

  /** 要素とその子孫から編集用の内部属性を除去する。 */
  private stripEditorAttrs(root: Element): void {
    const strip = (e: Element): void => {
      e.removeAttribute(SPROUT_ID_ATTR)
      e.removeAttribute(SELECTED_ATTR)
      e.removeAttribute('contenteditable')
      Array.from(e.children).forEach(strip)
    }
    strip(root)
  }

  /** 新規挿入した要素とその子孫に一意IDを付与する。 */
  private assignIdsTo(root: Element): void {
    const assign = (e: Element): void => {
      e.setAttribute(SPROUT_ID_ATTR, this.nextId())
      Array.from(e.children).forEach(assign)
    }
    assign(root)
  }

  // ---- 移動(ドラッグ&ドロップ) ----

  /** source要素を target要素に対して指定位置へ移動する。 */
  moveElement(sourceId: string, targetId: string, position: DropPosition): void {
    if (sourceId === targetId) return
    const source = this.getEl(sourceId)
    const target = this.getEl(targetId)
    if (!source || !target) return
    // 自分の子孫へは移動できない(DOM循環防止)。
    if (source.contains(target)) return

    this.beginChange()
    if (position === 'inside') {
      target.appendChild(source)
    } else if (position === 'before') {
      target.parentElement?.insertBefore(source, target)
    } else {
      target.parentElement?.insertBefore(source, target.nextSibling)
    }
    this.markDirty()
    this.refreshTree()
    this.select(sourceId)
  }

  // ---- Undo/Redo ----

  undo(): void {
    if (this.undoStack.length === 0) return
    this.redoStack.push(this.currentBodyHtml())
    const prev = this.undoStack.pop() as string
    this.restoreBodyHtml(prev)
  }

  redo(): void {
    if (this.redoStack.length === 0) return
    this.undoStack.push(this.currentBodyHtml())
    const next = this.redoStack.pop() as string
    this.restoreBodyHtml(next)
  }

  private restoreBodyHtml(html: string): void {
    const doc = this.doc
    if (!doc?.body) return
    doc.body.innerHTML = html
    this.selectedId = null
    this.markDirty()
    this.refreshTree()
    this.callbacks.onSelectionChange(null)
    this.emitHistory()
  }

  // ---- 保存用シリアライズ ----

  serialize(): string {
    const doc = this.doc
    if (!doc) return ''
    // 選択マーカーを外してから直列化(serializer内でも除去するが念のため)。
    doc.querySelectorAll(`[${SELECTED_ATTR}]`).forEach((el) => el.removeAttribute(SELECTED_ATTR))
    const html = serializeForSave(doc)
    if (this.selectedId) this.getEl(this.selectedId)?.setAttribute(SELECTED_ATTR, '')
    return html
  }

  markSaved(): void {
    this.dirty = false
    this.callbacks.onDirtyChange(false)
  }

  // ---- 内部補助 ----

  private requireSelected(): Element | null {
    if (!this.selectedId) return null
    return this.getEl(this.selectedId)
  }

  /** 選択マーカーを除いた現在のbody HTMLを返す(履歴スナップショット用)。 */
  private currentBodyHtml(): string {
    const doc = this.doc
    if (!doc?.body) return ''
    doc.querySelectorAll(`[${SELECTED_ATTR}]`).forEach((el) => el.removeAttribute(SELECTED_ATTR))
    const html = doc.body.innerHTML
    if (this.selectedId) this.getEl(this.selectedId)?.setAttribute(SELECTED_ATTR, '')
    return html
  }

  /** 変更操作の直前に呼び、現在状態をUndoスタックへ積む。 */
  private beginChange(): void {
    this.undoStack.push(this.currentBodyHtml())
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift()
    this.redoStack = []
    this.emitHistory()
  }

  private resetHistory(): void {
    this.undoStack = []
    this.redoStack = []
    this.dirty = false
    this.callbacks.onDirtyChange(false)
    this.emitHistory()
  }

  private markDirty(): void {
    if (!this.dirty) {
      this.dirty = true
      this.callbacks.onDirtyChange(true)
    }
  }

  private emitHistory(): void {
    this.callbacks.onHistoryChange(this.undoStack.length > 0, this.redoStack.length > 0)
  }

  private refreshTree(): void {
    const doc = this.doc
    if (doc) this.callbacks.onTreeChange(buildTree(doc))
  }

  /** 既存IDと衝突しない新規IDを発行する。 */
  private nextId(): string {
    const doc = this.doc
    let n = doc?.documentElement.querySelectorAll(`[${SPROUT_ID_ATTR}]`).length ?? 0
    // 衝突回避のためインクリメント。
    while (doc?.querySelector(`[${SPROUT_ID_ATTR}="s${n}"]`)) n++
    return `s${n}`
  }
}
