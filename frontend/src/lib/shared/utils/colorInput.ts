// カラーピッカー(<input type="color">)用の値変換ユーティリティ。
// input[type=color] は #rrggbb 形式のみ受け付けるため、
// 任意のCSS色文字列をピッカー表示用の値へ正規化する。

const HEX6 = /^#([0-9a-fA-F]{6})$/
const HEX3 = /^#([0-9a-fA-F]{3})$/

/**
 * CSS色文字列をカラーピッカー表示用の #rrggbb へ正規化する。
 * - #rgb は #rrggbb へ展開する。
 * - #rrggbb はそのまま小文字で返す。
 * - 名前付き色や rgb()、空文字など変換できない値は fallback を返す。
 */
export function toColorInputValue(value: string, fallback: string): string {
  const v = value.trim()
  if (HEX6.test(v)) return v.toLowerCase()
  const m = HEX3.exec(v)
  if (m) {
    const [r, g, b] = m[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  // fallback も正規化して必ず妥当な #rrggbb を返す。
  if (HEX6.test(fallback)) return fallback.toLowerCase()
  const fm = HEX3.exec(fallback)
  if (fm) {
    const [r, g, b] = fm[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return '#000000'
}
