// ファイル関連APIの呼び出し。バックエンドFastAPIとの通信窓口。

import type { BrowseResult } from '../../shared/types'
import { apiClient } from './client'

export const fileApi = {
  /** ディレクトリ一覧を取得する。path未指定でルート。 */
  browse(path?: string): Promise<BrowseResult> {
    const q = path ? `?path=${encodeURIComponent(path)}` : ''
    return apiClient.get<BrowseResult>(`/api/browse${q}`)
  },

  /** HTMLファイルの中身を取得する。 */
  readFile(path: string): Promise<{ path: string; content: string }> {
    return apiClient.get(`/api/file?path=${encodeURIComponent(path)}`)
  },

  /** HTMLを上書き保存する。 */
  saveFile(path: string, content: string): Promise<{ path: string; saved: boolean }> {
    return apiClient.post('/api/file', { path, content })
  },
}

/** 指定HTMLファイルのディレクトリを基点にした、アセット配信用 base href を組み立てる。 */
export function buildAssetBaseHref(filePath: string): string {
  // Windowsパスの区切りを正規化し、ディレクトリ部分を取り出す。
  const normalized = filePath.replace(/\\/g, '/')
  const dir = normalized.slice(0, normalized.lastIndexOf('/'))
  // 末尾スラッシュ必須(相対参照が dir 配下に解決されるように)。
  return `/assets/${dir}/`
}
