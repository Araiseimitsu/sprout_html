// API通信の共通クライアント。エラーハンドリングを一元化する。
// .svelte から直接 fetch せず、必ずこの層を経由する。

/** APIエラー。UI側で message を表示する。 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch (e) {
    throw new ApiError('サーバーに接続できませんでした', 0)
  }
  if (!res.ok) {
    let detail = `エラーが発生しました (${res.status})`
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch {
      // JSON以外のエラー応答は既定メッセージのまま。
    }
    throw new ApiError(detail, res.status)
  }
  return (await res.json()) as T
}

export const apiClient = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
}
