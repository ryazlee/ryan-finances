import { categorize } from './categorize.ts'
import { MONTHLY_HEADERS } from './constants.ts'
import type { Rule, Transaction } from './types.ts'

export type DetailTransaction = {
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

export type SummaryDirection = 'in' | 'out'

export type MonthSummary = {
  month: string
  accountId: string
  accountName: string
  mask: string
  category: string
  direction: SummaryDirection
  amount: number
  count: number
}

type Cell = string | number | boolean

const MONTH = /^(\d{4}-\d{2})-\d{2}$/

export function roundMoney(amount: number): number {
  return Number(amount.toFixed(2))
}

export function transactionMonth(date: string): string | null {
  return MONTH.exec(date)?.[1] ?? null
}

export function isOpenMonth(date: string, oldestOpen: string): boolean {
  const month = transactionMonth(date)
  if (!month) return true
  return month >= oldestOpen
}

export function isRolledUp(tx: Pick<Transaction, 'count'>): boolean {
  return tx.count != null
}

function summaryKey(row: Pick<MonthSummary, 'month' | 'accountId' | 'category' | 'direction'>): string {
  return [row.month, row.accountId, row.category, row.direction].join('\0')
}

function compareSummaries(a: MonthSummary, b: MonthSummary): number {
  return b.month.localeCompare(a.month)
    || a.category.localeCompare(b.category)
    || a.accountName.localeCompare(b.accountName)
    || a.mask.localeCompare(b.mask)
    || a.direction.localeCompare(b.direction)
}

export function mergeSummaries(existing: MonthSummary[], added: MonthSummary[]): MonthSummary[] {
  const groups = new Map<string, MonthSummary>()
  for (const row of [...existing, ...added]) {
    const key = summaryKey(row)
    const current = groups.get(key)
    if (current) {
      current.amount = roundMoney(current.amount + row.amount)
      current.count += row.count
      if (!current.accountName && row.accountName) current.accountName = row.accountName
      if (!current.mask && row.mask) current.mask = row.mask
    } else {
      groups.set(key, { ...row, amount: roundMoney(row.amount) })
    }
  }
  return [...groups.values()].sort(compareSummaries)
}

export function condenseRows(
  rows: DetailTransaction[],
  rules: Rule[],
  oldestOpen: string,
): { kept: DetailTransaction[]; summaries: MonthSummary[]; archivedIds: string[] } {
  const kept: DetailTransaction[] = []
  const archivedIds: string[] = []
  const seen = new Set<string>()
  const groups = new Map<string, MonthSummary>()

  for (const row of rows) {
    if (!row.id || seen.has(row.id)) continue
    seen.add(row.id)
    if (isOpenMonth(row.date, oldestOpen)) {
      kept.push(row)
      continue
    }
    // A pending charge often posts later under the same id. Leave it off the
    // archive list so that update can still be recorded and folded.
    if (row.pending) continue
    archivedIds.push(row.id)
    if (row.removed) continue

    const month = transactionMonth(row.date)
    if (!month) continue
    const category = categorize(row, rules).category || 'Uncategorized'
    const direction: SummaryDirection = row.amount < 0 ? 'in' : 'out'
    const key = summaryKey({ month, accountId: row.accountId, category, direction })
    const current = groups.get(key)
    if (current) {
      current.amount = roundMoney(current.amount + row.amount)
      current.count += 1
    } else {
      groups.set(key, {
        month,
        accountId: row.accountId,
        accountName: row.accountName,
        mask: row.mask,
        category,
        direction,
        amount: roundMoney(row.amount),
        count: 1,
      })
    }
  }

  return {
    kept,
    summaries: [...groups.values()].sort(compareSummaries),
    archivedIds,
  }
}

export function summaryTransaction(row: MonthSummary): Transaction {
  const noun = row.count === 1 ? 'transaction' : 'transactions'
  return {
    id: `summary:${row.month}:${row.accountId}:${row.category}:${row.direction}`,
    accountId: row.accountId,
    accountName: row.accountName,
    mask: row.mask,
    date: `${row.month}-01`,
    name: row.category,
    merchant: `${row.category} · ${row.count} ${noun}`,
    amount: row.amount,
    pending: false,
    plaidCategory: '',
    categoryAuto: row.category,
    categoryOverride: row.category,
    category: row.category,
    source: 'rule',
    removed: false,
    count: row.count,
  }
}

function cellAt(row: Cell[], index: number): string {
  const value = row[index]
  if (value == null) return ''
  return String(value).trim()
}

export function parseSummaryGrid(values: Cell[][]): MonthSummary[] {
  if (values.length < 2) return []
  const header = values[0] ?? []
  const column = (name: string) => header.findIndex((cell) => String(cell).trim() === name)
  const monthCol = column('month')
  const accountCol = column('account_id')
  const nameCol = column('account_name')
  const maskCol = column('mask')
  const categoryCol = column('category')
  const directionCol = column('direction')
  const amountCol = column('amount')
  const countCol = column('count')
  const rows: MonthSummary[] = []
  for (const row of values.slice(1)) {
    const month = cellAt(row, monthCol)
    const accountId = cellAt(row, accountCol)
    const category = cellAt(row, categoryCol)
    const direction = cellAt(row, directionCol)
    if (!/^\d{4}-\d{2}$/.test(month) || !accountId || !category) continue
    if (direction !== 'in' && direction !== 'out') continue
    const amount = Number(cellAt(row, amountCol))
    const count = Number(cellAt(row, countCol))
    rows.push({
      month,
      accountId,
      accountName: cellAt(row, nameCol),
      mask: cellAt(row, maskCol),
      category,
      direction,
      amount: Number.isFinite(amount) ? roundMoney(amount) : 0,
      count: Number.isFinite(count) && count > 0 ? Math.round(count) : 1,
    })
  }
  return rows
}

export function summaryGrid(rows: MonthSummary[]): (string | number)[][] {
  return [
    [...MONTHLY_HEADERS],
    ...rows.map((row) => [
      row.month,
      row.accountId,
      row.accountName,
      row.mask,
      row.category,
      row.direction,
      row.amount,
      row.count,
    ]),
  ]
}
