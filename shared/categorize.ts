import { EXCLUDED_SPEND } from './constants.ts'
import type { CategorySource, Rule, RuleField, Transaction } from './types.ts'

export type FlowTransaction = Pick<Transaction, 'amount' | 'category' | 'pending' | 'removed'> &
  Partial<Pick<Transaction, 'name' | 'merchant' | 'plaidCategory'>>

export type CategoryInput = {
  name: string
  merchant: string
  plaidCategory: string
  categoryOverride: string
}

const FIELD_VALUE: Record<RuleField, (tx: CategoryInput) => string> = {
  name: (tx) => tx.name,
  merchant: (tx) => tx.merchant,
  plaid_category: (tx) => tx.plaidCategory,
}

export function titleCasePlaid(primary: string): string {
  const cleaned = primary.trim()
  if (!cleaned) return 'Uncategorized'
  return cleaned
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function categorize(
  tx: CategoryInput,
  rules: Rule[],
): { category: string; auto: string; source: CategorySource } {
  const ordered = rules
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule }) => rule.pattern.trim() && rule.category.trim())
    .sort((a, b) => a.rule.priority - b.rule.priority || a.index - b.index)

  let auto = titleCasePlaid(tx.plaidCategory)
  let matched = false
  for (const { rule } of ordered) {
    const haystack = FIELD_VALUE[rule.field](tx).toLowerCase()
    if (!haystack) continue
    if (haystack.includes(rule.pattern.trim().toLowerCase())) {
      auto = rule.category.trim()
      matched = true
      break
    }
  }

  const override = tx.categoryOverride.trim()
  if (override) {
    return { category: override, auto, source: 'override' }
  }
  return { category: auto, auto, source: matched ? 'rule' : 'plaid' }
}

const INVESTMENT_RE = /\b(?:stocks?|brokerage|investments?|fidelity|vanguard|schwab|robinhood|ameritrade|wealthfront|betterment|acorns)\b|e[*-]?trade/i

export function isVenmo(tx: Partial<Pick<Transaction, 'name' | 'merchant'>>): boolean {
  return `${tx.merchant ?? ''} ${tx.name ?? ''}`.toLowerCase().includes('venmo')
}

export function isRentActivity(tx: FlowTransaction): boolean {
  const plaid = (tx.plaidCategory ?? '').toLowerCase()
  if (plaid.includes('rent')) return true
  if (tx.category.trim().toLowerCase() === 'rent') return true
  const label = `${tx.name ?? ''} ${tx.merchant ?? ''}`.toLowerCase()
  if (/rental|rent[- ]a[- ]car/.test(label)) return false
  return /\brent\b/.test(label)
}

export function isInvestmentActivity(tx: FlowTransaction): boolean {
  return INVESTMENT_RE.test(`${tx.name ?? ''} ${tx.merchant ?? ''} ${tx.category} ${tx.plaidCategory ?? ''}`)
}

function isNotableFlow(tx: FlowTransaction): boolean {
  return isVenmo(tx) || isRentActivity(tx) || isInvestmentActivity(tx)
}

/** Label used when grouping money in and money out. Venmo, rent, and brokerage stay visible. */
export function flowCategory(tx: FlowTransaction): string {
  if (isVenmo(tx)) return 'Venmo'
  if (isRentActivity(tx)) return 'Rent'
  if (isInvestmentActivity(tx)) return 'Investments'
  return tx.category.trim() || 'Uncategorized'
}

export function countsAsSpend(tx: FlowTransaction): boolean {
  if (tx.removed || tx.pending || !(tx.amount > 0)) return false
  const category = tx.category.trim().toLowerCase()
  if (!EXCLUDED_SPEND.has(category)) return true
  if (category === 'income') return false
  return isNotableFlow(tx)
}

export function countsAsInflow(tx: FlowTransaction): boolean {
  if (tx.removed || tx.pending || !(tx.amount < 0)) return false
  const category = tx.category.trim().toLowerCase()
  if (category !== 'transfer' && category !== 'payment') return true
  return isNotableFlow(tx)
}
