import type { AiDesignStyle } from '../types'

export interface AiDesignStyleOption {
  id: AiDesignStyle
  label: string
  description: string
}

export const DEFAULT_AI_DESIGN_STYLE: AiDesignStyle = 'vertical_scroll'

export const AI_DESIGN_STYLE_OPTIONS: AiDesignStyleOption[] = [
  {
    id: 'vertical_scroll',
    label: '縦スクロール',
    description: '通常のWebページ向け。セクションを上から順に読ませます。',
  },
  {
    id: 'slide_deck',
    label: '横送りスライド',
    description: '提案資料やLP向け。画面単位で横に送る構成にします。',
  },
  {
    id: 'story_split',
    label: 'ストーリー型',
    description: 'サービス紹介向け。ビジュアルと本文を交互に見せます。',
  },
  {
    id: 'dashboard_grid',
    label: 'ダッシュボード型',
    description: '比較や一覧向け。カードや指標を密度高く整理します。',
  },
]
