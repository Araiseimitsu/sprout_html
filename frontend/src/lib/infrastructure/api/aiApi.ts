// AI(生成・編集・画像)APIの呼び出し。バックエンドFastAPIとの通信窓口。
// .svelte から直接 fetch せず、必ずこの層を経由する。

import type { AiDesignStyle, AiHtmlResult, AiImageResult, AiStatus } from '../../shared/types'
import { apiClient } from './client'

export const aiApi = {
  /** AI機能の利用可否とモデル名を取得する。 */
  status(): Promise<AiStatus> {
    return apiClient.get<AiStatus>('/api/ai/status')
  },

  /** 要望からHTMLページをゼロ生成する。 */
  generate(prompt: string, model: string, designStyle: AiDesignStyle): Promise<AiHtmlResult> {
    return apiClient.post('/api/ai/generate', { prompt, model, design_style: designStyle })
  },

  /** ページ全体を指示に従って編集する。 */
  editFull(instruction: string, html: string, model: string): Promise<AiHtmlResult> {
    return apiClient.post('/api/ai/edit', { instruction, html, model })
  },

  /** 選択要素(HTML断片)を指示に従って編集する。 */
  editFragment(instruction: string, fragment: string, model: string): Promise<AiHtmlResult> {
    return apiClient.post('/api/ai/edit-fragment', { instruction, fragment, model })
  },

  /** 画像を生成する。reference_path があればファイル保存、無ければ data URI。 */
  image(prompt: string, referencePath: string | null): Promise<AiImageResult> {
    return apiClient.post('/api/ai/image', {
      prompt,
      reference_path: referencePath,
    })
  },
}
