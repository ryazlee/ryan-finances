import { writeSession } from './session'

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

export function forgetSession(token: string) {
  if (!token) return
  void fetch(`${apiOrigin}/api/session`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  }).catch(() => {
    // The local copy is already gone. The server copy expires on its own.
  })
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  const sentToken = accessToken
  if (sentToken) headers.set('authorization', `Bearer ${sentToken}`)
  const response = await fetch(`${apiOrigin}${path}`, { ...init, headers })
  const data = (await response.json().catch(() => ({}))) as { error?: unknown }
  if (response.ok && /^[a-f0-9]{64}$/.test(sentToken)) writeSession(sentToken)
  if (response.status === 401 && sentToken && sentToken === accessToken) onUnauthorized()
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : `Request failed (${response.status}).`
    throw new ApiError(response.status, message)
  }
  return data as T
}
