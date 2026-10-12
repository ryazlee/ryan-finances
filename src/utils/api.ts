const apiOrigin = (import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/$/, '')

let accessToken = ''
let onUnauthorized: () => void = () => {}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function setAccessToken(token: string) {
  accessToken = token
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`)
  const response = await fetch(`${apiOrigin}${path}`, { ...init, headers })
  const data = (await response.json().catch(() => ({}))) as { error?: unknown }
  if (response.status === 401) onUnauthorized()
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : `Request failed (${response.status}).`
    throw new ApiError(response.status, message)
  }
  return data as T
}
