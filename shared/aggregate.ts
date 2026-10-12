import { countsAsInflow, countsAsSpend, flowCategory } from './categorize.ts'
import type { Transaction } from './types.ts'

export type AmountRow = {
  key: string
  label: string
  amount: number
}

export type FlowSplit = {
  key: string
  label: string
  out: number
  in: number
}

export type MonthBreakdown = {
  key: string
  label: string
  out: number
  in: number
  categories: FlowSplit[]
  accounts: FlowSplit[]
}

function inMonth(tx: Transaction, month: string | null): boolean {
  if (!month) return true
  return tx.date.startsWith(month)
}

function spendTransactions(transactions: Transaction[], month: string | null): Transaction[] {
  return transactions.filter((tx) => countsAsSpend(tx) && inMonth(tx, month))
}

function inflowTransactions(transactions: Transaction[], month: string | null): Transaction[] {
  return transactions.filter((tx) => countsAsInflow(tx) && inMonth(tx, month))
}

function sumBy(
  transactions: Transaction[],
  keyOf: (tx: Transaction) => { key: string; label: string },
  amountOf: (tx: Transaction) => number = (tx) => tx.amount,
): AmountRow[] {
  const totals = new Map<string, AmountRow>()
  for (const tx of transactions) {
    const { key, label } = keyOf(tx)
    const amount = amountOf(tx)
    const current = totals.get(key)
    if (current) {
      current.amount += amount
    } else {
      totals.set(key, { key, label, amount })
    }
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label))
}

function categoryKey(tx: Transaction): { key: string; label: string } {
  const label = flowCategory(tx)
  return { key: label, label }
}

export function spendByCategory(transactions: Transaction[], month: string | null): AmountRow[] {
  return sumBy(spendTransactions(transactions, month), categoryKey)
}

export function spendByAccount(transactions: Transaction[], month: string | null): AmountRow[] {
  return sumBy(spendTransactions(transactions, month), (tx) => ({
    key: tx.accountId,
    label: tx.mask ? `${tx.accountName} ••${tx.mask}` : tx.accountName,
  }))
}

export function outflowTotal(transactions: Transaction[], month: string | null): number {
  return spendTransactions(transactions, month).reduce((sum, tx) => sum + tx.amount, 0)
}

export function inflowTotal(transactions: Transaction[], month: string | null): number {
  return inflowTransactions(transactions, month).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
}

export function spendInMonth(transactions: Transaction[], month: string): number {
  return outflowTotal(transactions, month)
}

export function inflowInMonth(transactions: Transaction[], month: string): number {
  return inflowTotal(transactions, month)
}

export function transactionCount(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + (tx.count ?? 1), 0)
}

export function spendByMonth(transactions: Transaction[], months: string[]): AmountRow[] {
  return months.map((month) => ({
    key: month,
    label: month,
    amount: spendInMonth(transactions, month),
  }))
}

export type MonthStack = AmountRow & {
  parts: AmountRow[]
}

export function spendByMonthStacked(transactions: Transaction[], months: string[]): MonthStack[] {
  return months.map((month) => {
    const categories = spendByCategory(transactions, month)
    const top = categories.slice(0, 6)
    const rest = categories.slice(6).reduce((sum, row) => sum + row.amount, 0)
    const parts = rest > 0 ? [...top, { key: 'Other', label: 'Other', amount: rest }] : top
    return {
      key: month,
      label: month,
      amount: parts.reduce((sum, row) => sum + row.amount, 0),
      parts,
    }
  })
}

function addSplit(
  groups: Map<string, FlowSplit>,
  key: string,
  label: string,
  direction: 'out' | 'in',
  amount: number,
) {
  const current = groups.get(key) ?? { key, label, out: 0, in: 0 }
  current[direction] += amount
  groups.set(key, current)
}

function sortedSplits(groups: Map<string, FlowSplit>): FlowSplit[] {
  return [...groups.values()].sort(
    (a, b) => Math.max(b.out, b.in) - Math.max(a.out, a.in) || b.out - a.out || a.label.localeCompare(b.label),
  )
}

export function breakdownByMonth(transactions: Transaction[], months: string[]): MonthBreakdown[] {
  return months.map((month) => {
    const categories = new Map<string, FlowSplit>()
    const accounts = new Map<string, FlowSplit>()
    let out = 0
    let incoming = 0
    for (const tx of transactions) {
      if (!tx.date.startsWith(month)) continue
      const direction = countsAsSpend(tx) ? 'out' : countsAsInflow(tx) ? 'in' : null
      if (!direction) continue
      const amount = Math.abs(tx.amount)
      if (direction === 'out') out += amount
      else incoming += amount
      const category = flowCategory(tx)
      addSplit(categories, category, category, direction, amount)
      const accountLabel = tx.mask ? `${tx.accountName} ••${tx.mask}` : tx.accountName
      addSplit(accounts, tx.accountId, accountLabel, direction, amount)
    }
    return {
      key: month,
      label: month,
      out,
      in: incoming,
      categories: sortedSplits(categories),
      accounts: sortedSplits(accounts),
    }
  })
}
