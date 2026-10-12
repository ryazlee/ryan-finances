import type { SyncCounts } from '../shared/types'
import { plaid } from './clients'
import {
  googleCredentials,
  missingSecrets,
  plaidEnvironment,
  sheetId,
  type Env,
} from './env'
import { json, originAllowed, readJson } from './http'
import { readItems, writeItems } from './items'
import { buildSnapshot } from './sheet'
import { syncAll } from './sync'

async function institutionName(env: Env, accessToken: string): Promise<string> {
  const itemResponse = await plaid<{
    item: { institution_id?: string | null; institution_name?: string | null }
  }>(env, '/item/get', { access_token: accessToken })
  if (itemResponse.item.institution_name) return itemResponse.item.institution_name
  if (!itemResponse.item.institution_id) return 'Bank'
  try {
    const institution = await plaid<{ institution: { name: string } }>(env, '/institutions/get_by_id', {
      institution_id: itemResponse.item.institution_id,
      country_codes: ['US'],
    })
    return institution.institution.name || 'Bank'
  } catch {
    return 'Bank'
  }
}

function requireReady(env: Env): Response | null {
  if (!sheetId(env) || !googleCredentials(env)) {
    return json({ error: 'Add the Google Sheet id and service account before linking a bank.', missing: missingSecrets(env) }, 400)
  }
  if (!env.PLAID_CLIENT_ID?.trim() || !env.PLAID_SECRET?.trim()) {
    return json({ error: 'Add Plaid keys before linking a bank.', missing: missingSecrets(env) }, 400)
  }
  if (!plaidEnvironment(env)) {
    return json({ error: 'Plaid Development was retired. Set PLAID_ENV to sandbox or production.' }, 400)
  }
  return null
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url

  if (request.method === 'GET' && pathname === '/api/snapshot') {
    return json(await buildSnapshot(env))
  }

  if (request.method !== 'POST') {
    return json({ error: 'Not found.' }, 404)
  }
  if (!originAllowed(request)) {
    return json({ error: 'Cross-origin request blocked.' }, 403)
  }

  if (pathname === '/api/link/token') {
    const blocked = requireReady(env)
    if (blocked) return blocked
    const created = await plaid<{ link_token: string }>(env, '/link/token/create', {
      client_name: 'Purchase Tracker',
      language: 'en',
      country_codes: ['US'],
      user: { client_user_id: 'owner' },
      products: ['transactions'],
      transactions: { days_requested: 730 },
    })
    return json({ link_token: created.link_token })
  }

  if (pathname === '/api/link/exchange') {
    const blocked = requireReady(env)
    if (blocked) return blocked
    const body = (await readJson(request)) as { public_token?: unknown }
    const publicToken = body.public_token
    if (typeof publicToken !== 'string' || !publicToken.startsWith('public-')) {
      return json({ error: 'Missing a Plaid public token.' }, 400)
    }
    const exchanged = await plaid<{ access_token: string; item_id: string }>(
      env,
      '/item/public_token/exchange',
      { public_token: publicToken },
    )
    const institution = await institutionName(env, exchanged.access_token)
    const items = await readItems(env)
    const previous = items.find((item) => item.itemId === exchanged.item_id)
    const next = items.filter((item) => item.itemId !== exchanged.item_id)
    next.push({
      itemId: exchanged.item_id,
      accessToken: exchanged.access_token,
      cursor: previous?.cursor ?? null,
      institution,
    })
    await writeItems(env, next)
    let sync: SyncCounts | null = null
    let syncError: string | null = null
    try {
      sync = await syncAll(env)
    } catch (error) {
      syncError = error instanceof Error ? error.message : 'Sync failed after linking.'
    }
    return json({
      itemId: exchanged.item_id,
      institution,
      sync,
      syncError,
    })
  }

  if (pathname === '/api/sync') {
    const blocked = requireReady(env)
    if (blocked) return blocked
    const sync = await syncAll(env)
    return json(sync)
  }

  return json({ error: 'Not found.' }, 404)
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    try {
      if (url.pathname.startsWith('/api/')) {
        return await handleApi(request, env)
      }
      return env.ASSETS.fetch(request)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed.'
      if (url.pathname.startsWith('/api/')) return json({ error: message }, 500)
      return new Response(message, { status: 500 })
    }
  },

  async scheduled(_controller, env, ctx): Promise<void> {
    ctx.waitUntil(
      syncAll(env).then(
        (result) => {
          console.log(JSON.stringify({ ok: true, ...result }))
        },
        (error: unknown) => {
          const message = error instanceof Error ? error.message : 'Sync failed.'
          console.log(JSON.stringify({ ok: false, error: message }))
        },
      ),
    )
  },
} satisfies ExportedHandler<Env>
