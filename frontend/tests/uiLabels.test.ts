import assert from 'node:assert/strict'
import {
  describeElement,
  getEditableStyleGroups,
  getFullscreenToggleLabel,
  getInsertableBlocks,
  getStyleDefaults,
  getStyleQuickOptions,
  toColorInputValue,
} from '../src/lib/shared/utils/uiLabels.ts'

assert.equal(describeElement('h1').name, '大見出し')
assert.equal(describeElement('div').name, 'レイアウト枠')
assert.equal(describeElement('custom-widget').name, 'カスタム部品')
assert.equal(getFullscreenToggleLabel(false), '全画面表示')
assert.equal(getFullscreenToggleLabel(true), '通常表示')

const blocks = getInsertableBlocks()
assert.deepEqual(
  blocks.map((block) => block.label),
  ['文章', '大見出し', '小見出し', '画像', 'リンク', 'ボタン', 'レイアウト枠'],
)

const groups = getEditableStyleGroups()
assert.deepEqual(
  groups.map((group) => group.title),
  ['文字', '余白とサイズ', '背景と枠', '配置'],
)

assert.equal(getStyleDefaults()['font-size'], '16px')
assert.deepEqual(
  getStyleQuickOptions()['text-align'].map((option) => option.label),
  ['左', '中央', '右'],
)

const textStyles = groups.find((group) => group.title === '文字')?.styles ?? []
assert.equal(textStyles.find((item) => item.prop === 'color')?.kind, 'color')

const backgroundStyles = groups.find((group) => group.title === '背景と枠')?.styles ?? []
assert.equal(backgroundStyles.find((item) => item.prop === 'background-color')?.kind, 'color')

assert.equal(toColorInputValue('', 'rgb(255, 0, 128)', '#222222'), '#ff0080')
assert.equal(toColorInputValue('not-a-color', '', '#ffffff'), '#ffffff')
