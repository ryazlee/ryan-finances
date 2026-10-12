import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { spendByAccount, spendByCategory, spendByMonth, spendInMonth } from './aggregate.ts'
import type { Transaction } from './types.ts'

function tx(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'amount' | 'category' | 'date'>): Transaction {
  return {
    accountId: 'acct-1',
    accountName: 'Sapphire',
    mask: '4242',
    name: partial.category,
    merchant: partial.category,
    pending: false,
    plaidCategory: 'FOOD_AND_DRINK',
    categoryAuto: partial.category,
    categoryOverride: '',
    source: 'rule',
    removed: false,
    ...partial,
  }
}

const rows: Transaction[] = [
  tx({ id: '1', date: '2026-10-02', amount: 10, category: 'Food' }),
  tx({ id: '2', date: '2026-10-03', amount: 5, category: 'Coffee' }),
  tx({ id: '3', date: '2026-10-04', amount: 400, category: 'Payment' }),
  tx({ id: '4', date: '2026-10-05', amount: -100, category: 'Food' }),
  tx({ id: '5', date: '2026-10-06', amount: 8, category: 'Food', pending: true }),
  tx({ id: '6', date: '2026-09-15', amount: 20, category: 'Food', accountId: 'acct-2', accountName: 'Freedom', mask: '1881' }),
]

describe('aggregate', () => {
  it('sums posted outflows in a month and skips payments', () => {
    assert.equal(spendInMonth(rows, '2026-10'), 15)
    const categories = spendByCategory(rows, '2026-10')
    assert.deepEqual(
      categories.map((row) => [row.label, row.amount]),
      [
        ['Food', 10],
        ['Coffee', 5],
      ],
    )
  })

  it('fills empty months and splits cards', () => {
    const months = spendByMonth(rows, ['2026-08', '2026-09', '2026-10'])
    assert.deepEqual(months.map((row) => row.amount), [0, 20, 15])
    const cards = spendByAccount(rows, null)
    assert.equal(cards[0]?.label, 'Freedom ••1881')
    assert.equal(cards[0]?.amount, 20)
    assert.equal(cards[1]?.label, 'Sapphire ••4242')
    assert.equal(cards[1]?.amount, 15)
  })
})
