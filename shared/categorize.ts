import { EXCLUDED_SPEND } from './constants.ts'
import type { CategorySource, Rule, RuleField, Transaction } from './types.ts'

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

export function countsAsSpend(tx: Pick<Transaction, 'amount' | 'category' | 'pending' | 'removed'>): boolean {
  if (tx.removed || tx.pending) return false
  if (!(tx.amount > 0)) return false
  return !EXCLUDED_SPEND.has(tx.category.trim().toLowerCase())
}
