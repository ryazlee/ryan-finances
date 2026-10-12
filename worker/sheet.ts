import { categorize } from '../shared/categorize'
import {
  mergeSummaries,
  parseSummaryGrid,
  summaryGrid,
  summaryTransaction,
  type MonthSummary,
} from '../shared/condense'
import {
  ACCOUNT_HEADERS,
  ARCHIVE_HEADERS,
  DEFAULT_RULES,
  MONTHLY_HEADERS,
  RULE_FIELDS,
  RULE_HEADERS,
  SHEET_TABS,
  TX_HEADERS,
} from '../shared/constants'
import { expandedGrid } from '../shared/sheet-grid'
import type { Account, Rule, RuleField, Snapshot, Transaction } from '../shared/types'
import { sheetsJson } from './clients'
import { googleCredentials, missingSecrets, plaidEnvironment, sheetId, type Env } from './env'
import { readItems } from './items'

type Cell = string | number | boolean
type Grid = Cell[][]

export type StoredTransaction = {
  id: string
  accountId: string
  accountName: string
  mask: string
  date: string
  name: string
  merchant: string
  amount: number
  pending: boolean
  plaidCategory: string
  categoryOverride: string
  removed: boolean
}

function columnIndex(header: Cell[], name: string): number {
  return header.findIndex((cell) => String(cell).trim() === name)
}

function cell(row: Cell[], index: number): string {
  if (index < 0) return ''
  const value = row[index]
  if (value == null) return ''
  return String(value).trim()
}

function isYes(value: string): boolean {
  const normalized = value.toLowerCase()
  return normalized === 'true' || normalized === 'yes' || normalized === '1'
}

function isRuleField(value: string): value is RuleField {
  return (RULE_FIELDS as string[]).includes(value)
}

async function tabTitles(env: Env): Promise<string[]> {
  const spreadsheet = await sheetsJson<{ sheets?: { properties?: { title?: string } }[] }>(
    env,
    '?fields=sheets.properties.title',
  )
  return (spreadsheet.sheets ?? [])
    .map((sheet) => sheet.properties?.title ?? '')
    .filter(Boolean)
}

async function addTabs(env: Env, titles: string[]): Promise<void> {
  if (titles.length === 0) return
  await sheetsJson(env, ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({
      requests: titles.map((title) => ({ addSheet: { properties: { title } } })),
    }),
  })
}

async function readRange(env: Env, range: string): Promise<Grid> {
  try {
    const payload = await sheetsJson<{ values?: Grid }>(
      env,
      `/values/${encodeURIComponent(range)}`,
    )
    return payload.values ?? []
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/unable to parse range/i.test(message) || /not found/i.test(message)) return []
    throw error
  }
}

async function writeRange(env: Env, range: string, values: Grid): Promise<void> {
  await sheetsJson(env, `/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values }),
  })
}

type NeededGrid = { title: string; rows: number; columns: number }

async function ensureGrids(env: Env, needed: NeededGrid[]): Promise<void> {
  if (needed.length === 0) return
  const spreadsheet = await sheetsJson<{
    sheets?: {
      properties?: {
        sheetId?: number
        title?: string
        gridProperties?: { rowCount?: number; columnCount?: number }
      }
    }[]
  }>(env, '?fields=sheets.properties(sheetId,title,gridProperties)')
  const sizes = new Map<string, { sheetId: number; rowCount: number; columnCount: number }>()
  for (const sheet of spreadsheet.sheets ?? []) {
    const properties = sheet.properties
    const title = properties?.title
    if (!title || properties.sheetId == null) continue
    sizes.set(title, {
      sheetId: properties.sheetId,
      rowCount: properties.gridProperties?.rowCount ?? 0,
      columnCount: properties.gridProperties?.columnCount ?? 0,
    })
  }

  const requests = needed.flatMap((sheet) => {
    const current = sizes.get(sheet.title)
    if (!current) throw new Error(`Missing ${sheet.title} tab.`)
    const next = expandedGrid(current, sheet.rows, sheet.columns)
    if (!next) return []
    return [
      {
        updateSheetProperties: {
          properties: {
            sheetId: current.sheetId,
            gridProperties: next,
          },
          fields: 'gridProperties(rowCount,columnCount)',
        },
      },
    ]
  })
  if (requests.length === 0) return
  await sheetsJson(env, ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests }),
  })
}

function padRows(values: Grid, previousCount: number, width: number): Grid {
  const blank = Array.from({ length: width }, () => '')
  while (values.length < previousCount) values.push([...blank])
  return values
}

export function parseRules(values: Grid): Rule[] {
  if (values.length < 2) return []
  const header = values[0] ?? []
  const priorityCol = columnIndex(header, 'priority')
  const fieldCol = columnIndex(header, 'field')
  const patternCol = columnIndex(header, 'pattern')
  const categoryCol = columnIndex(header, 'category')
  const rules: Rule[] = []
  for (const row of values.slice(1)) {
    const field = cell(row, fieldCol)
    const pattern = cell(row, patternCol)
    const category = cell(row, categoryCol)
    if (!isRuleField(field) || !pattern || !category) continue
    const priority = Number(cell(row, priorityCol))
    rules.push({
      priority: Number.isFinite(priority) ? priority : 100,
      field,
      pattern,
      category,
    })
  }
  return rules
}

export function parseTransactions(values: Grid): StoredTransaction[] {
  if (values.length < 2) return []
  const header = values[0] ?? []
  const col = (name: string) => columnIndex(header, name)
  const rows: StoredTransaction[] = []
  for (const row of values.slice(1)) {
    const id = cell(row, col('transaction_id'))
    if (!id) continue
    const amount = Number(cell(row, col('amount')))
    rows.push({
      id,
      accountId: cell(row, col('account_id')),
      accountName: cell(row, col('account_name')),
      mask: cell(row, col('mask')),
      date: cell(row, col('date')),
      name: cell(row, col('name')),
      merchant: cell(row, col('merchant')),
      amount: Number.isFinite(amount) ? amount : 0,
      pending: isYes(cell(row, col('pending'))),
      plaidCategory: cell(row, col('plaid_category')),
      categoryOverride: cell(row, col('category_override')),
      removed: isYes(cell(row, col('removed'))),
    })
  }
  return rows
}

export function transactionGrid(rows: StoredTransaction[], rules: Rule[], previousCount: number): Grid {
  const body = rows.map((row) => {
    const categorized = categorize(row, rules)
    return [
      row.id,
      row.accountId,
      row.accountName,
      row.mask,
      row.date,
      row.name,
      row.merchant,
      row.amount,
      row.pending ? 'true' : 'false',
      row.plaidCategory,
      categorized.auto,
      row.categoryOverride,
      categorized.category,
      row.removed ? 'true' : 'false',
    ]
  })
  return padRows([[...TX_HEADERS], ...body], previousCount, TX_HEADERS.length)
}

function toPublicTransaction(row: StoredTransaction, rules: Rule[]): Transaction {
  const categorized = categorize(row, rules)
  return {
    ...row,
    categoryAuto: categorized.auto,
    category: categorized.category,
    source: categorized.source,
  }
}

export async function ensureWorkbook(env: Env): Promise<void> {
  const existing = new Set(await tabTitles(env))
  const needed = Object.values(SHEET_TABS).filter((title) => !existing.has(title))
  await addTabs(env, needed)

  const transactions = await readRange(env, `${SHEET_TABS.transactions}!A1:N1`)
  if (transactions.length === 0) {
    await writeRange(env, `${SHEET_TABS.transactions}!A1`, [[...TX_HEADERS]])
  }

  const accounts = await readRange(env, `${SHEET_TABS.accounts}!A1:H1`)
  if (accounts.length === 0) {
    await writeRange(env, `${SHEET_TABS.accounts}!A1`, [[...ACCOUNT_HEADERS]])
  }

  const rules = await readRange(env, `${SHEET_TABS.rules}!A1:D`)
  if (rules.length === 0) {
    await writeRange(env, `${SHEET_TABS.rules}!A1`, [
      [...RULE_HEADERS],
      ...DEFAULT_RULES.map((rule) => [rule.priority, rule.field, rule.pattern, rule.category]),
    ])
  }

  const monthly = await readRange(env, `${SHEET_TABS.monthly}!A1:H1`)
  if (monthly.length === 0) {
    await writeRange(env, `${SHEET_TABS.monthly}!A1`, [[...MONTHLY_HEADERS]])
  }

  const archived = await readRange(env, `${SHEET_TABS.archived}!A1:A1`)
  if (archived.length === 0) {
    await writeRange(env, `${SHEET_TABS.archived}!A1`, [[...ARCHIVE_HEADERS]])
  }
}

export async function readWorkbook(env: Env): Promise<{
  transactions: StoredTransaction[]
  rules: Rule[]
  accounts: Account[]
  summaries: MonthSummary[]
  transactionRows: number
  accountRows: number
  summaryRows: number
}> {
  const [transactionValues, ruleValues, accountValues, summaryValues] = await Promise.all([
    readRange(env, `${SHEET_TABS.transactions}!A:N`),
    readRange(env, `${SHEET_TABS.rules}!A:D`),
    readRange(env, `${SHEET_TABS.accounts}!A:H`),
    readRange(env, `${SHEET_TABS.monthly}!A:H`),
  ])
  return {
    transactions: parseTransactions(transactionValues),
    rules: parseRules(ruleValues),
    accounts: parseAccounts(accountValues),
    summaries: mergeSummaries(parseSummaryGrid(summaryValues), []),
    transactionRows: transactionValues.length,
    accountRows: accountValues.length,
    summaryRows: summaryValues.length,
  }
}

export async function readArchivedIds(env: Env): Promise<{ ids: Set<string>; rows: number }> {
  const values = await readRange(env, `${SHEET_TABS.archived}!A:A`)
  const ids = new Set<string>()
  for (const row of values.slice(1)) {
    const id = cell(row, 0)
    if (id) ids.add(id)
  }
  return { ids, rows: values.length }
}

function parseAccounts(values: Grid): Account[] {
  if (values.length < 2) return []
  const header = values[0] ?? []
  const col = (name: string) => columnIndex(header, name)
  const accounts: Account[] = []
  for (const row of values.slice(1)) {
    const accountId = cell(row, col('account_id'))
    if (!accountId) continue
    const lastSynced = cell(row, col('last_synced'))
    accounts.push({
      itemId: cell(row, col('item_id')),
      institution: cell(row, col('institution')),
      accountId,
      accountName: cell(row, col('account_name')),
      mask: cell(row, col('mask')),
      type: cell(row, col('type')),
      subtype: cell(row, col('subtype')),
      lastSynced: lastSynced || null,
    })
  }
  return accounts
}

export async function writeTransactions(
  env: Env,
  rows: StoredTransaction[],
  rules: Rule[],
  previousCount: number,
): Promise<void> {
  const values = transactionGrid(rows, rules, previousCount)
  await ensureGrids(env, [
    { title: SHEET_TABS.transactions, rows: values.length, columns: TX_HEADERS.length },
  ])
  await writeRange(env, `${SHEET_TABS.transactions}!A1`, values)
}

export async function writeFold(
  env: Env,
  summaries: MonthSummary[],
  previousSummaryRows: number,
  archivedIds: string[],
  archivedRows: number,
): Promise<void> {
  const summaryValues = padRows(summaryGrid(summaries), previousSummaryRows, MONTHLY_HEADERS.length)
  const data: { range: string; values: Grid }[] = [
    { range: `${SHEET_TABS.monthly}!A1`, values: summaryValues },
  ]
  const needed: NeededGrid[] = [
    { title: SHEET_TABS.monthly, rows: summaryValues.length, columns: MONTHLY_HEADERS.length },
  ]
  if (archivedIds.length > 0) {
    const startRow = (archivedRows || 1) + 1
    data.push({
      range: `${SHEET_TABS.archived}!A${startRow}`,
      values: archivedIds.map((id) => [id]),
    })
    needed.push({
      title: SHEET_TABS.archived,
      rows: startRow + archivedIds.length - 1,
      columns: ARCHIVE_HEADERS.length,
    })
  }
  await ensureGrids(env, needed)
  await sheetsJson(env, '/values:batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'RAW', data }),
  })
}

export async function writeAccounts(env: Env, accounts: Account[], previousCount: number): Promise<void> {
  const body = accounts.map((account) => [
    account.itemId,
    account.institution,
    account.accountId,
    account.accountName,
    account.mask,
    account.type,
    account.subtype,
    account.lastSynced ?? '',
  ])
  const values = padRows([[...ACCOUNT_HEADERS], ...body], previousCount, ACCOUNT_HEADERS.length)
  await ensureGrids(env, [
    { title: SHEET_TABS.accounts, rows: values.length, columns: ACCOUNT_HEADERS.length },
  ])
  await writeRange(env, `${SHEET_TABS.accounts}!A1`, values)
}

export async function buildSnapshot(env: Env): Promise<Snapshot> {
  const missing = missingSecrets(env)
  const credentials = googleCredentials(env)
  const linkedItems = (await readItems(env)).length
  const base: Snapshot = {
    sheetConfigured: Boolean(sheetId(env) && credentials),
    plaidConfigured: Boolean(env.PLAID_CLIENT_ID?.trim() && env.PLAID_SECRET?.trim() && plaidEnvironment(env)),
    missing,
    serviceAccountEmail: credentials?.email ?? null,
    plaidEnv: plaidEnvironment(env),
    syncedAt: null,
    linkedItems,
    accounts: [],
    transactions: [],
  }
  if (!base.sheetConfigured) return base

  const workbook = await readWorkbook(env)
  const transactions = [
    ...workbook.transactions
      .filter((row) => !row.removed)
      .map((row) => toPublicTransaction(row, workbook.rules)),
    ...workbook.summaries.map(summaryTransaction),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount)
  const syncedAt = workbook.accounts.reduce<string | null>((latest, account) => {
    if (!account.lastSynced) return latest
    if (!latest || account.lastSynced > latest) return account.lastSynced
    return latest
  }, null)

  return {
    ...base,
    syncedAt,
    accounts: workbook.accounts,
    transactions,
  }
}
