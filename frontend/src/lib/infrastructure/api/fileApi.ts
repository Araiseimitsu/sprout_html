// ファイル関連APIの呼び出し。バックエンドFastAPIとの通信窓口。

import type { BrowseResult, FileDialogResult } from '../../shared/types'
import { apiClient } from './client'
export { buildAssetBaseHref } from '../../shared/utils/assetPath'

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

  /** ローカルPCの標準保存ダイアログを開く。 */
  saveFileDialog(initialPath?: string): Promise<FileDialogResult> {
    const q = initialPath ? `?path=${encodeURIComponent(initialPath)}` : ''
    return apiClient.get<FileDialogResult>(`/api/save-dialog${q}`)
  },

  /** ローカルPCの標準ファイル選択ダイアログを開く。 */
  openFileDialog(): Promise<FileDialogResult> {
    return apiClient.get<FileDialogResult>('/api/file-dialog')
  },

  /** HTMLを上書き保存する。 */
  saveFile(path: string, content: string): Promise<{ path: string; saved: boolean }> {
    return apiClient.post('/api/file', { path, content })
  },
}

