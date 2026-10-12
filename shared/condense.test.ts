import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { spendByCategory, spendInMonth } from './aggregate.ts'
import { categorize } from './categorize.ts'
import {
  condenseRows,
  mergeSummaries,
  parseSummaryGrid,
  roundMoney,
  summaryGrid,
  summaryTransaction,
  type DetailTransaction,
} from './condense.ts'
import { oldestOpenMonth } from './months.ts'
import type { Rule, Transaction } from './types.ts'

const rules: Rule[] = [
  { priority: 10, field: 'name', pattern: 'starbucks', category: 'Coffee' },
]

function detail(partial: Partial<DetailTransaction> & Pick<DetailTransaction, 'id' | 'date' | 'amount'>): DetailTransaction {
  return {
    accountId: 'acct-1',
    accountName: 'Sapphire',
    mask: '4242',
    name: 'Store',
    merchant: 'Store',
    pending: false,
    plaidCategory: 'GENERAL_MERCHANDISE',
    categoryOverride: '',
    removed: false,
    ...partial,
  }
}

const from = new Date(2026, 9, 12)

describe('condense', () => {
  it('keeps the current month and the three before it', () => {
    assert.equal(oldestOpenMonth(from), '2026-07')
    const folded = condenseRows(
      [
        detail({ id: 'june', date: '2026-06-30', amount: 12, name: 'Starbucks' }),
        detail({ id: 'july', date: '2026-07-01', amount: 4, name: 'Starbucks' }),
        detail({ id: 'october', date: '2026-10-02', amount: 8, name: 'Market' }),
      ],
      rules,
      oldestOpenMonth(from),
    )
    assert.deepEqual(folded.kept.map((row) => row.id), ['july', 'october'])
    assert.deepEqual(folded.archivedIds, ['june'])
    assert.equal(folded.summaries[0]?.month, '2026-06')
    assert.equal(folded.summaries[0]?.category, 'Coffee')
    assert.equal(folded.summaries[0]?.amount, 12)
    assert.equal(folded.summaries[0]?.count, 1)
  })

  it('matches spend after folding, including refunds, payments, and overrides', () => {
    const rows = [
      detail({ id: 'food-a', date: '2026-05-02', amount: 0.1, name: 'Market', plaidCategory: 'FOOD_AND_DRINK' }),
      detail({ id: 'food-b', date: '2026-05-03', amount: 0.2, name: 'Market', plaidCategory: 'FOOD_AND_DRINK' }),
      detail({ id: 'refund', date: '2026-05-04', amount: -3, name: 'Market', plaidCategory: 'FOOD_AND_DRINK' }),
      detail({ id: 'override', date: '2026-05-05', amount: 6, name: 'Starbucks', categoryOverride: 'Household' }),
      detail({ id: 'payment', date: '2026-05-06', amount: 400, name: 'Thank you', plaidCategory: 'LOAN_PAYMENTS' }),
      detail({ id: 'pending', date: '2026-05-07', amount: 9, pending: true }),
      detail({ id: 'gone', date: '2026-05-08', amount: 15, removed: true }),
      detail({ id: 'other-card', date: '2026-05-09', amount: 20, accountId: 'acct-2', accountName: 'Freedom', mask: '1881', name: 'Market', plaidCategory: 'FOOD_AND_DRINK' }),
      detail({ id: 'recent', date: '2026-10-01', amount: 5, name: 'Market', plaidCategory: 'FOOD_AND_DRINK' }),
    ]
    const foodRules: Rule[] = [
      { priority: 10, field: 'name', pattern: 'starbucks', category: 'Coffee' },
      { priority: 100, field: 'plaid_category', pattern: 'FOOD_AND_DRINK', category: 'Food' },
      { priority: 100, field: 'plaid_category', pattern: 'LOAN_PAYMENTS', category: 'Payment' },
    ]
    const folded = condenseRows(rows, foodRules, oldestOpenMonth(from))
    const asTransaction = (row: DetailTransaction): Transaction => {
      const category = categorize(row, foodRules)
      return { ...row, categoryAuto: category.auto, category: category.category, source: category.source }
    }
    const before = rows.map(asTransaction)
    const after = [...folded.kept.map(asTransaction), ...folded.summaries.map(summaryTransaction)]

    assert.equal(roundMoney(spendInMonth(before, '2026-05')), roundMoney(spendInMonth(after, '2026-05')))
    assert.equal(roundMoney(spendInMonth(after, '2026-05')), 26.3)
    assert.deepEqual(
      spendByCategory(after, '2026-05').map((row) => [row.label, row.amount]),
      [
        ['Food', 20.3],
        ['Household', 6],
      ],
    )
    assert.deepEqual(folded.archivedIds, ['food-a', 'food-b', 'refund', 'override', 'payment', 'gone', 'other-card'])
    assert.equal(folded.kept.map((row) => row.id).join(), 'recent')
    const refund = folded.summaries.find((row) => row.direction === 'in')
    assert.equal(refund?.amount, -3)
    assert.equal(refund?.count, 1)
    const food = folded.summaries.find((row) => row.category === 'Food' && row.accountId === 'acct-1' && row.direction === 'out')
    assert.equal(food?.amount, 0.3)
    assert.equal(food?.count, 2)
    assert.ok(food)
    assert.equal(summaryTransaction(food).merchant, 'Food · 2 transactions')
    assert.equal(summaryTransaction(food).date, '2026-05-01')
  })

  it('adds a later purchase onto an existing month total', () => {
    const merged = mergeSummaries(
      [{ month: '2026-05', accountId: 'acct-1', accountName: 'Sapphire', mask: '4242', category: 'Food', direction: 'out', amount: 10, count: 2 }],
      [{ month: '2026-05', accountId: 'acct-1', accountName: 'Sapphire', mask: '4242', category: 'Food', direction: 'out', amount: 4, count: 1 }],
    )
    assert.equal(merged.length, 1)
    assert.equal(merged[0]?.amount, 14)
    assert.equal(merged[0]?.count, 3)
  })

  it('round-trips the monthly grid', () => {
    const rows = mergeSummaries([], [
      { month: '2026-05', accountId: 'acct-1', accountName: 'Sapphire', mask: '4242', category: 'Food', direction: 'out', amount: 10.5, count: 4 },
    ])
    const parsed = parseSummaryGrid(summaryGrid(rows))
    assert.deepEqual(parsed, rows)
  })
})
