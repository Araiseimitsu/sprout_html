/** コンパクトレイアウトへ切り替える画面幅(px)。CSS の @media と揃える。 */
export const MOBILE_MAX_WIDTH = 768

export type MobileWorkspacePane = 'tree' | 'canvas' | 'properties'

export const MOBILE_WORKSPACE_PANES: { id: MobileWorkspacePane; label: string }[] = [
  { id: 'tree', label: '部品' },
  { id: 'canvas', label: 'プレビュー' },
  { id: 'properties', label: '設定' },
]
