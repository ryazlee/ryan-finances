import { googleCredentials, plaidHost, sheetId, type Env } from './env'

type GoogleToken = {
  token: string
  exp: number
  email: string
}

let cachedToken: GoogleToken | null = null

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  if (!pem.includes('BEGIN PRIVATE KEY')) {
    throw new Error('The service account key must be a PKCS8 private key (BEGIN PRIVATE KEY).')
  }
  const body = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const binary = Uint8Array.from(atob(body), (char) => char.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    binary,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

export async function googleAccessToken(env: Env): Promise<string> {
  const credentials = googleCredentials(env)
  if (!credentials) {
    throw new Error('Google service account credentials are missing.')
  }
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.email === credentials.email && cachedToken.exp > now + 60) {
    return cachedToken.token
  }

  const header = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claim = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: credentials.email,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    ),
  )
  const unsigned = `${header}.${claim}`
  const key = await importPrivateKey(credentials.privateKey)
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  )
  const assertion = `${unsigned}.${bytesToBase64Url(new Uint8Array(signature))}`
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const payload = (await response.json()) as { access_token?: string; error_description?: string }
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || 'Google rejected the service account.')
  }
  cachedToken = { token: payload.access_token, exp: now + 3600, email: credentials.email }
  return payload.access_token
}

export async function sheetsFetch(env: Env, path: string, init?: RequestInit): Promise<Response> {
  const id = sheetId(env)
  if (!id) throw new Error('GOOGLE_SHEET_ID is missing or invalid.')
  const token = await googleAccessToken(env)
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...init?.headers,
    },
  })
  return response
}

export async function sheetsJson<T>(env: Env, path: string, init?: RequestInit): Promise<T> {
  const response = await sheetsFetch(env, path, init)
  const text = await response.text()
  const payload = text ? (JSON.parse(text) as { error?: { message?: string } }) : {}
  if (!response.ok) {
    const message = payload.error?.message || `Google Sheets request failed (${response.status}).`
    if (/not found/i.test(message) || response.status === 404) {
      throw new Error('Could not open the spreadsheet. Check GOOGLE_SHEET_ID and share it with the service account as an Editor.')
    }
    throw new Error(message)
  }
  return payload as T
}

export async function plaid<T>(env: Env, path: string, body: Record<string, unknown>): Promise<T> {
  if (!env.PLAID_CLIENT_ID || !env.PLAID_SECRET) {
    throw new Error('Plaid keys are missing.')
  }
  const response = await fetch(`${plaidHost(env)}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: env.PLAID_CLIENT_ID,
      secret: env.PLAID_SECRET,
      ...body,
    }),
  })
  const text = await response.text()
  const payload = text
    ? (JSON.parse(text) as { error_message?: string; error_code?: string })
    : {}
  if (!response.ok) {
    throw new Error(payload.error_message || payload.error_code || `Plaid request failed (${response.status}).`)
  }
  return payload as T
}
