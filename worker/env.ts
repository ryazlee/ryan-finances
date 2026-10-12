export interface Env {
  ASSETS: Fetcher
  TOKENS: KVNamespace
  PLAID_CLIENT_ID?: string
  PLAID_SECRET?: string
  PLAID_ENV?: string
  GOOGLE_SHEET_ID?: string
  GOOGLE_SERVICE_ACCOUNT_JSON?: string
  GOOGLE_CLIENT_EMAIL?: string
  GOOGLE_PRIVATE_KEY?: string
}

export type GoogleCredentials = {
  email: string
  privateKey: string
}

export function googleCredentials(env: Env): GoogleCredentials | null {
  const json = env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  if (json) {
    try {
      const parsed = JSON.parse(json) as { client_email?: string; private_key?: string }
      if (parsed.client_email && parsed.private_key) {
        return {
          email: parsed.client_email,
          privateKey: normalizePem(parsed.private_key),
        }
      }
    } catch {
      return null
    }
  }

  const email = env.GOOGLE_CLIENT_EMAIL?.trim()
  const privateKey = env.GOOGLE_PRIVATE_KEY?.trim()
  if (!email || !privateKey) return null
  return { email, privateKey: normalizePem(privateKey) }
}

function normalizePem(key: string): string {
  let pem = key.trim()
  if (
    (pem.startsWith('"') && pem.endsWith('"')) ||
    (pem.startsWith("'") && pem.endsWith("'"))
  ) {
    pem = pem.slice(1, -1)
  }
  return pem.replace(/\\n/g, '\n')
}

export function sheetId(env: Env): string | null {
  const id = env.GOOGLE_SHEET_ID?.trim() ?? ''
  if (!/^[a-zA-Z0-9-_]+$/.test(id)) return null
  return id
}

export type PlaidEnvironment = 'sandbox' | 'production'

export function plaidEnvironment(env: Env): PlaidEnvironment | null {
  const value = (env.PLAID_ENV || 'sandbox').trim().toLowerCase()
  if (value === 'sandbox' || value === 'production') return value
  return null
}

export function plaidHost(env: Env): string {
  const name = plaidEnvironment(env)
  if (!name) {
    throw new Error('Plaid Development was retired. Set PLAID_ENV to sandbox or production.')
  }
  return `https://${name}.plaid.com`
}

export function missingSecrets(env: Env): string[] {
  const missing: string[] = []
  if (!env.PLAID_CLIENT_ID?.trim()) missing.push('PLAID_CLIENT_ID')
  if (!env.PLAID_SECRET?.trim()) missing.push('PLAID_SECRET')
  if (!sheetId(env)) missing.push('GOOGLE_SHEET_ID')
  if (!googleCredentials(env)) missing.push('GOOGLE_SERVICE_ACCOUNT_JSON')
  if (env.PLAID_ENV && !plaidEnvironment(env)) missing.push('PLAID_ENV')
  return missing
}
