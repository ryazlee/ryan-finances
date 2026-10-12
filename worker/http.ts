export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export function originAllowed(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    return false
  }
  const host = parsed.hostname
  if (host === 'localhost' || host === '127.0.0.1') return true
  return origin === new URL(request.url).origin
}

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text()
  if (text.length > 20_000) {
    throw new Error('Request body is too large.')
  }
  if (!text) return {}
  return JSON.parse(text) as unknown
}
