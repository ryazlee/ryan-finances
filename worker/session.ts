import type { Env } from './env'

const PREFIX = 'session:'
const TTL_SECONDS = 60 * 60 * 24 * 30

export async function createSession(env: Env, email: string): Promise<string> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const id = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  await env.TOKENS.put(`${PREFIX}${id}`, email, { expirationTtl: TTL_SECONDS })
  return id
}

export async function readSession(env: Env, id: string): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/.test(id)) return null
  const email = await env.TOKENS.get(`${PREFIX}${id}`)
  if (!email) return null
  await env.TOKENS.put(`${PREFIX}${id}`, email, { expirationTtl: TTL_SECONDS })
  return email
}

export async function deleteSession(env: Env, id: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(id)) return
  await env.TOKENS.delete(`${PREFIX}${id}`)
}
