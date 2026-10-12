const apiOrigin = (import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/$/, '')

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  const response = await fetch(`${apiOrigin}${path}`, { ...init, headers })
  const data = (await response.json().catch(() => ({}))) as { error?: unknown }
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : `Request failed (${response.status}).`
    throw new Error(message)
  }
  return data as T
}
