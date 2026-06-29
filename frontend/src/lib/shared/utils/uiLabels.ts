type ElementDescription = {
  name: string
  hint: string
}

type InsertableBlock = {
  tag: string
  label: string
  hint: string
}

export type EditableStyle = {
  prop: string
  label: string
  placeholder: string
  // 'color' のときはカラーピッカーを併設する。
  kind?: 'color'
}

export type StyleQuickOption = {
  label: string
  value: string
}

type EditableStyleGroup = {
  title: string
  styles: EditableStyle[]
}

const ELEMENT_DESCRIPTIONS: Record<string, ElementDescription> = {
  h1: { name: '大見出し', hint: 'ページで一番目立つ見出し' },
  h2: { name: '中見出し', hint: '内容を分ける見出し' },
  h3: { name: '小見出し', hint: '細かい区切りの見出し' },
  p: { name: '文章', hint: '本文や説明文' },
  span: { name: '短い文字', hint: '文中の一部分' },
  a: { name: 'リンク', hint: '別ページや外部サイトへの移動' },
  img: { name: '画像', hint: '写真や図版' },
  button: { name: 'ボタン', hint: 'クリックして使う操作' },
  ul: { name: '箇条書き', hint: '複数の項目をまとめたリスト' },
  li: { name: 'リスト項目', hint: '箇条書きの1項目' },
  div: { name: 'レイアウト枠', hint: '内容をまとめる入れ物' },
}

const STYLE_LABELS: Record<string, Omit<EditableStyle, 'prop'>> = {
  color: { label: '文字色', placeholder: '例: #222222' },
  'background-color': { label: '背景色', placeholder: '例: #ffffff' },
  'font-size': { label: '文字サイズ', placeholder: '例: 16px' },
  'font-weight': { label: '文字の太さ', placeholder: '例: bold' },
  'text-align': { label: '文字の位置', placeholder: '例: center' },
  margin: { label: '外側の余白', placeholder: '例: 16px' },
  padding: { label: '内側の余白', placeholder: '例: 12px' },
  border: { label: '枠線', placeholder: '例: 1px solid #ddd' },
  width: { label: '幅', placeholder: '例: 320px' },
  height: { label: '高さ', placeholder: '例: auto' },
  display: { label: '並び方', placeholder: '例: flex' },
}

const STYLE_DEFAULTS: Record<string, string> = {
  color: '#222222',
  'background-color': '#ffffff',
  'font-size': '16px',
  'font-weight': '400',
  'text-align': 'left',
  margin: '0',
  padding: '0',
  border: 'none',
  width: 'auto',
  height: 'auto',
  display: 'block',
}

const STYLE_QUICK_OPTIONS: Record<string, StyleQuickOption[]> = {
  'font-size': [
    { label: '小', value: '14px' },
    { label: '標準', value: '16px' },
    { label: '大', value: '24px' },
  ],
  'font-weight': [
    { label: '標準', value: '400' },
    { label: '太字', value: '700' },
  ],
  'text-align': [
    { label: '左', value: 'left' },
    { label: '中央', value: 'center' },
    { label: '右', value: 'right' },
  ],
  margin: [
    { label: 'なし', value: '0' },
    { label: '狭い', value: '8px' },
    { label: '標準', value: '16px' },
  ],
  padding: [
    { label: 'なし', value: '0' },
    { label: '狭い', value: '8px' },
    { label: '標準', value: '16px' },
  ],
  width: [
    { label: '自動', value: 'auto' },
    { label: '半分', value: '50%' },
    { label: '全幅', value: '100%' },
  ],
  height: [
    { label: '自動', value: 'auto' },
    { label: '小', value: '120px' },
    { label: '大', value: '320px' },
  ],
  display: [
    { label: '通常', value: 'block' },
    { label: '横並び', value: 'flex' },
    { label: '非表示', value: 'none' },
  ],
  border: [
    { label: 'なし', value: 'none' },
    { label: '薄線', value: '1px solid #d7ded8' },
    { label: '太線', value: '2px solid #8ea99a' },
  ],
}

export function describeElement(tag: string): ElementDescription {
  return ELEMENT_DESCRIPTIONS[tag] ?? { name: 'カスタム部品', hint: '独自の部品' }
}

export function getInsertableBlocks(): InsertableBlock[] {
  const preferredTags = ['p', 'h1', 'h3', 'img', 'a', 'button', 'div']
  return preferredTags.map((tag) => ({
    tag,
    label: describeElement(tag).name,
    hint: describeElement(tag).hint,
  }))
}

export function getFullscreenToggleLabel(isFullscreen: boolean): string {
  return isFullscreen ? '閉じる' : '全画面表示'
}

// カラーピッカーを併設するスタイルプロパティ。
const COLOR_STYLE_PROPS = ['color', 'background-color'] as const
const COLOR_PROPS = new Set<string>(COLOR_STYLE_PROPS)

function style(prop: string): EditableStyle {
  const base = { prop, ...STYLE_LABELS[prop] }
  return COLOR_PROPS.has(prop) ? { ...base, kind: 'color' } : base
}

export function getEditableStyleGroups(): EditableStyleGroup[] {
  return [
    { title: '文字', styles: [style('color'), style('font-size'), style('font-weight'), style('text-align')] },
    { title: '余白とサイズ', styles: [style('margin'), style('padding'), style('width'), style('height')] },
    { title: '背景と枠', styles: [style('background-color'), style('border')] },
    { title: '配置', styles: [style('display')] },
  ]
}

export function getStyleDefaults(): Record<string, string> {
  return STYLE_DEFAULTS
}

export function getStyleQuickOptions(): Record<string, StyleQuickOption[]> {
  return STYLE_QUICK_OPTIONS
}

function normalizeHex(value: string): string | null {
  const trimmed = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return null
}

function rgbToHex(value: string): string | null {
  const match = value
    .trim()
    .match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+[\d.]+)?\s*\)$/i)
  if (!match) return null
  const channels = match.slice(1, 4).map((channel) => Number(channel))
  if (channels.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) return null
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export function toColorInputValue(...candidates: string[]): string {
  for (const candidate of candidates) {
    const hex = normalizeHex(candidate) ?? rgbToHex(candidate)
    if (hex) return hex
  }
  return '#000000'
}
