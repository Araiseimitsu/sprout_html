import assert from 'node:assert/strict'
import {
  describeElement,
  getEditableStyleGroups,
  getInsertableBlocks,
  getStyleDefaults,
  getStyleQuickOptions,
} from '../src/lib/shared/utils/uiLabels.ts'

assert.equal(describeElement('h1').name, '大見出し')
assert.equal(describeElement('div').name, 'レイアウト枠')
assert.equal(describeElement('custom-widget').name, 'カスタム部品')

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
