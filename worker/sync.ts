import type { Account, SyncCounts } from '../shared/types'
import { plaid } from './clients'
import type { Env } from './env'
import { readItems, writeItems, type StoredItem } from './items'
import {
  ensureWorkbook,
  readWorkbook,
  writeAccounts,
  writeTransactions,
  type StoredTransaction,
} from './sheet'

type PlaidAccount = {
  account_id: string
  name: string
  official_name?: string | null
  mask?: string | null
  type: string
  subtype?: string | null
}

type PlaidTransaction = {
  transaction_id: string
  account_id: string
  date?: string | null
  authorized_date?: string | null
  name?: string | null
  merchant_name?: string | null
  amount: number
  pending?: boolean
  pending_transaction_id?: string | null
  personal_finance_category?: { primary?: string | null } | null
}

type SyncPage = {
  added: PlaidTransaction[]
  modified: PlaidTransaction[]
  removed: { transaction_id: string }[]
  next_cursor: string
  has_more: boolean
}

function applyTransaction(
  rows: Map<string, StoredTransaction>,
  tx: PlaidTransaction,
  accounts: Map<string, PlaidAccount>,
): void {
  const account = accounts.get(tx.account_id)
  const existing = rows.get(tx.transaction_id)
  const pendingSource = tx.pending_transaction_id ? rows.get(tx.pending_transaction_id) : undefined
  const date = (tx.pending ? tx.authorized_date || tx.date : tx.date || tx.authorized_date) || ''
  rows.set(tx.transaction_id, {
    id: tx.transaction_id,
    accountId: tx.account_id,
    accountName: account?.official_name || account?.name || existing?.accountName || 'Account',
    mask: account?.mask || existing?.mask || '',
    date: date || existing?.date || '',
    name: tx.name || existing?.name || 'Transaction',
    merchant: tx.merchant_name || tx.name || existing?.merchant || '',
    amount: Number(tx.amount) || 0,
    pending: Boolean(tx.pending),
    plaidCategory: tx.personal_finance_category?.primary || existing?.plaidCategory || '',
    categoryOverride: existing?.categoryOverride || pendingSource?.categoryOverride || '',
    removed: false,
  })
}

async function pullItem(
  env: Env,
  item: StoredItem,
  rows: Map<string, StoredTransaction>,
  accounts: Account[],
  syncedAt: string,
): Promise<{ added: number; modified: number; removed: number; cursor: string | null }> {
  const accountResponse = await plaid<{ accounts: PlaidAccount[] }>(env, '/accounts/get', {
    access_token: item.accessToken,
  })
  const byId = new Map(accountResponse.accounts.map((account) => [account.account_id, account]))
  for (const account of accountResponse.accounts) {
    accounts.push({
      itemId: item.itemId,
      institution: item.institution,
      accountId: account.account_id,
      accountName: account.official_name || account.name,
      mask: account.mask || '',
      type: account.type,
      subtype: account.subtype || '',
      lastSynced: syncedAt,
    })
  }

  let cursor = item.cursor
  let hasMore = true
  let pages = 0
  let added = 0
  let modified = 0
  let removed = 0
  let nextCursor = cursor

  while (hasMore) {
    pages += 1
    if (pages > 40) {
      throw new Error('Plaid returned more pages than this sync will follow. Run sync again.')
    }
    const page = await plaid<SyncPage>(env, '/transactions/sync', {
      access_token: item.accessToken,
      count: 500,
      ...(cursor ? { cursor } : {}),
    })
    for (const tx of page.added ?? []) {
      added += 1
      applyTransaction(rows, tx, byId)
    }
    for (const tx of page.modified ?? []) {
      modified += 1
      applyTransaction(rows, tx, byId)
    }
    for (const tx of page.removed ?? []) {
      const existing = rows.get(tx.transaction_id)
      if (existing && !existing.removed) {
        existing.removed = true
        removed += 1
      }
    }
    nextCursor = page.next_cursor || nextCursor
    cursor = page.next_cursor || cursor
    hasMore = Boolean(page.has_more)
  }

  return { added, modified, removed, cursor: nextCursor }
}

export async function syncAll(env: Env): Promise<SyncCounts> {
  await ensureWorkbook(env)
  const items = await readItems(env)
  const workbook = await readWorkbook(env)
  const rows = new Map(workbook.transactions.map((row) => [row.id, row]))
  const accounts: Account[] = []
  const syncedAt = new Date().toISOString()
  let added = 0
  let modified = 0
  let removed = 0

  for (const item of items) {
    const result = await pullItem(env, item, rows, accounts, syncedAt)
    item.cursor = result.cursor
    added += result.added
    modified += result.modified
    removed += result.removed
  }

  const ordered = [...rows.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
  )
  await writeTransactions(env, ordered, workbook.rules, workbook.transactionRows)
  await writeAccounts(env, accounts, workbook.accountRows)
  await writeItems(env, items)

  return {
    added,
    modified,
    removed,
    accounts: accounts.length,
  }
}
