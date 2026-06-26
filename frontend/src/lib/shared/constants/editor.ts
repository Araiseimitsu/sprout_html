// 編集エンジンで使う定数。マジックナンバー/文字列の集中管理。

/** iframe内の各要素に付与する一意ID属性名。保存時に除去する。 */
export const SPROUT_ID_ATTR = 'data-sprout-id'

/** 編集エンジンが注入した要素(スタイル/オーバーレイ/base)を示す印。保存時に除去する。 */
export const SPROUT_INJECTED_ATTR = 'data-sprout-injected'

/** スクリプト無効化時に元のtype値を退避する属性名。 */
export const SPROUT_SCRIPT_TYPE_ATTR = 'data-sprout-script-type'

/** 無効化スクリプトに付与するtype値(ブラウザが実行しない値)。 */
export const DISABLED_SCRIPT_TYPE = 'application/sprout-disabled'

/** Undo/Redo スタックの最大保持数。 */
export const MAX_HISTORY = 100

/** プロパティパネルで提示する、よく使うスタイルプロパティ。 */
export const COMMON_STYLE_PROPS = [
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'text-align',
  'margin',
  'padding',
  'border',
  'width',
  'height',
  'display',
] as const

/** カラーピッカーを併設するスタイルプロパティ(色系の正本)。 */
export const COLOR_STYLE_PROPS = ['color', 'background-color'] as const

/** 要素追加で選べる代表的なタグ。 */
export const INSERTABLE_TAGS = [
  'div',
  'p',
  'span',
  'h1',
  'h2',
  'h3',
  'a',
  'ul',
  'li',
  'img',
  'button',
] as const
