import type { SyncCounts } from '../shared/types'
import { allowedEmail, verifiedGoogleEmail } from './auth'
import { plaid } from './clients'
import {
  googleCredentials,
  missingSecrets,
  plaidEnvironment,
  sheetId,
  type Env,
} from './env'
import { corsHeaders, json, originAllowed, readJson } from './http'
import { readItems, writeItems } from './items'
import { createSession, deleteSession, readSession } from './session'
import { buildSnapshot, setCategoryOverride } from './sheet'
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

function bearer(request: Request): string {
  const header = request.headers.get('authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7).trim() : ''
}

async function requireUser(request: Request, env: Env): Promise<Response | null> {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? ''
  if (!clientId) return json({ error: 'Google sign-in is not configured.' }, 401, request)
  const token = bearer(request)
  if (token && !token.includes('.')) {
    const email = await readSession(env, token)
    if (email === allowedEmail(env)) return null
    return json({ error: 'Sign in with Google.' }, 401, request)
  }
  const email = await verifiedGoogleEmail(request, clientId)
  if (!email) return json({ error: 'Sign in with Google.' }, 401, request)
  if (email !== allowedEmail(env)) {
    return json({ error: 'This Google account cannot open the tracker.' }, 403, request)
  }
  return null
}

function requireReady(request: Request, env: Env): Response | null {
  if (!sheetId(env) || !googleCredentials(env)) {
    return json({ error: 'Add the Google Sheet id and service account before linking a bank.', missing: missingSecrets(env) }, 400, request)
  }
  if (!env.PLAID_CLIENT_ID?.trim() || !env.PLAID_SECRET?.trim()) {
    return json({ error: 'Add Plaid keys before linking a bank.', missing: missingSecrets(env) }, 400, request)
  }
  if (!plaidEnvironment(env)) {
    return json({ error: 'Plaid Development was retired. Set PLAID_ENV to sandbox or production.' }, 400, request)
  }
  return null
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url

  if (request.method === 'OPTIONS') {
    if (!originAllowed(request)) return json({ error: 'Cross-origin request blocked.' }, 403, request)
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  }

  if (!originAllowed(request)) {
    return json({ error: 'Cross-origin request blocked.' }, 403, request)
  }

  if (request.method === 'POST' && pathname === '/api/session') {
    const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? ''
    if (!clientId) return json({ error: 'Google sign-in is not configured.' }, 401, request)
    const email = await verifiedGoogleEmail(request, clientId)
    if (!email) return json({ error: 'Sign in with Google.' }, 401, request)
    if (email !== allowedEmail(env)) {
      return json({ error: 'This Google account cannot open the tracker.' }, 403, request)
    }
    return json({ session: await createSession(env, email) }, 200, request)
  }

  const denied = await requireUser(request, env)
  if (denied) return denied

  if (request.method === 'DELETE' && pathname === '/api/session') {
    await deleteSession(env, bearer(request))
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  }

  if (request.method === 'GET' && pathname === '/api/snapshot') {
    return json(await buildSnapshot(env), 200, request)
  }

  if (request.method !== 'POST') {
    return json({ error: 'Not found.' }, 404, request)
  }

  if (pathname === '/api/link/token') {
    const blocked = requireReady(request, env)
    if (blocked) return blocked
    const created = await plaid<{ link_token: string }>(env, '/link/token/create', {
      client_name: 'Purchase Tracker',
      language: 'en',
      country_codes: ['US'],
      user: { client_user_id: 'owner' },
      products: ['transactions'],
      transactions: { days_requested: 730 },
    })
    return json({ link_token: created.link_token }, 200, request)
  }

  if (pathname === '/api/link/exchange') {
    const blocked = requireReady(request, env)
    if (blocked) return blocked
    const body = (await readJson(request)) as { public_token?: unknown }
    const publicToken = body.public_token
    if (typeof publicToken !== 'string' || !publicToken.startsWith('public-')) {
      return json({ error: 'Missing a Plaid public token.' }, 400, request)
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
    }, 200, request)
  }

  if (pathname === '/api/category') {
    if (!sheetId(env) || !googleCredentials(env)) {
      return json({ error: 'Add the Google Sheet id and service account before categorizing.' }, 400, request)
    }
    const body = (await readJson(request)) as { transactionId?: unknown; category?: unknown }
    const transactionId = body.transactionId
    const category = body.category
    if (typeof transactionId !== 'string' || !transactionId.trim()) {
      return json({ error: 'Missing a transaction.' }, 400, request)
    }
    if (transactionId.startsWith('summary:')) {
      return json({ error: 'That month is already a total. Categorize a purchase while it is still listed.' }, 400, request)
    }
    if (typeof category !== 'string' || category.trim().length > 48 || /[\r\n]/.test(category)) {
      return json({ error: 'Enter a category of 48 characters or fewer.' }, 400, request)
    }
    await setCategoryOverride(env, transactionId.trim(), category)
    return json({ ok: true }, 200, request)
  }

  if (pathname === '/api/sync') {
    const blocked = requireReady(request, env)
    if (blocked) return blocked
    const sync = await syncAll(env)
    return json(sync, 200, request)
  }

  return json({ error: 'Not found.' }, 404, request)
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
      if (url.pathname.startsWith('/api/')) return json({ error: message }, 500, request)
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
