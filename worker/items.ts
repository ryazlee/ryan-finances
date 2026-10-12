import type { Env } from './env'

export type StoredItem = {
  itemId: string
  accessToken: string
  cursor: string | null
  institution: string
}

const KEY = 'plaid-items'

export async function readItems(env: Env): Promise<StoredItem[]> {
  const raw = await env.TOKENS.get(KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as { items?: StoredItem[] }
    return Array.isArray(parsed.items) ? parsed.items : []
  } catch {
    return []
  }
}

export async function writeItems(env: Env, items: StoredItem[]): Promise<void> {
  await env.TOKENS.put(KEY, JSON.stringify({ items }))
}
