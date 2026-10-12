import { countsAsSpend } from './categorize.ts'
import type { Transaction } from './types.ts'

export type AmountRow = {
  key: string
  label: string
  amount: number
}

function spendTransactions(transactions: Transaction[], month: string | null): Transaction[] {
  return transactions.filter((tx) => {
    if (!countsAsSpend(tx)) return false
    if (month && !tx.date.startsWith(month)) return false
    return true
  })
}

function sumBy(
  transactions: Transaction[],
  keyOf: (tx: Transaction) => { key: string; label: string },
): AmountRow[] {
  const totals = new Map<string, AmountRow>()
  for (const tx of transactions) {
    const { key, label } = keyOf(tx)
    const current = totals.get(key)
    if (current) {
      current.amount += tx.amount
    } else {
      totals.set(key, { key, label, amount: tx.amount })
    }
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label))
}

export function spendByCategory(transactions: Transaction[], month: string | null): AmountRow[] {
  return sumBy(spendTransactions(transactions, month), (tx) => ({
    key: tx.category,
    label: tx.category,
  }))
}

export function spendByAccount(transactions: Transaction[], month: string | null): AmountRow[] {
  return sumBy(spendTransactions(transactions, month), (tx) => ({
    key: tx.accountId,
    label: tx.mask ? `${tx.accountName} ••${tx.mask}` : tx.accountName,
  }))
}

export function spendInMonth(transactions: Transaction[], month: string): number {
  return spendTransactions(transactions, month).reduce((sum, tx) => sum + tx.amount, 0)
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
