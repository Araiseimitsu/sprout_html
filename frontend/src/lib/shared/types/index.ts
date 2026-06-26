// アプリ全体で共有する型定義。

/** ファイルブラウザの1エントリ。 */
export interface FileEntry {
  name: string
  path: string
  is_dir: boolean
  is_html: boolean
}

/** ディレクトリ一覧のレスポンス。 */
export interface BrowseResult {
  current: string
  parent: string
  entries: FileEntry[]
}

/** 要素ツリーの1ノード。iframe内のDOMを軽量表現したもの。 */
export interface TreeNode {
  /** data-sprout-id。iframe内の実要素と対応づける一意キー。 */
  id: string
  /** 小文字のタグ名 (div, p, h1 ...)。 */
  tag: string
  /** class属性 (表示用)。 */
  className: string
  /** 要素内の短いテキストプレビュー。 */
  textPreview: string
  children: TreeNode[]
}

/** プロパティパネルが扱う、選択要素の編集対象情報。 */
export interface SelectionInfo {
  id: string
  tag: string
  /** 直接の属性 (class, id, href, src など)。 */
  attributes: Record<string, string>
  /** インラインスタイル (style属性) のキー/値。 */
  styles: Record<string, string>
  /** カラーピッカー表示用の計算済み色。 */
  computedColors: Record<string, string>
  /** 子要素を持たずテキストのみか (テキスト編集可否の目安)。 */
  textContent: string
}
