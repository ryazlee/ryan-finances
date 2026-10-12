import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  breakdownByMonth,
  inflowInMonth,
  inflowTotal,
  spendByAccount,
  spendByCategory,
  spendByMonth,
  spendByMonthStacked,
  spendInMonth,
  transactionCount,
} from './aggregate.ts'
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

  it('counts rolled-up rows as their underlying purchases', () => {
    assert.equal(transactionCount([rows[0]!, { ...rows[1]!, count: 4 }]), 5)
  })

  it('stacks a month by category', () => {
    const stacked = spendByMonthStacked(rows, ['2026-10'])
    assert.equal(stacked[0]?.amount, 15)
    assert.deepEqual(
      stacked[0]?.parts.map((part) => [part.label, part.amount]),
      [
        ['Food', 10],
        ['Coffee', 5],
      ],
    )
  })

  it('keeps venmo, rent, brokerage, and paychecks in the right direction', () => {
    const extra = [
      ...rows,
      tx({ id: '7', date: '2026-10-07', amount: 42, category: 'Transfer', name: 'Venmo', merchant: 'Venmo' }),
      tx({ id: '8', date: '2026-10-07', amount: -18, category: 'Transfer', name: 'Venmo', merchant: 'Venmo' }),
      tx({ id: '9', date: '2026-10-08', amount: 1800, category: 'Transfer', name: 'Apartment rent', merchant: 'Landlord' }),
      tx({ id: '10', date: '2026-10-09', amount: 300, category: 'Transfer', name: 'Schwab Brokerage', merchant: 'Charles Schwab' }),
      tx({ id: '11', date: '2026-10-10', amount: -2400, category: 'Income', name: 'Payroll', merchant: 'Payroll' }),
      tx({ id: '12', date: '2026-10-11', amount: 50, category: 'Transfer', name: 'Online transfer', merchant: 'Bank' }),
    ]
    assert.equal(spendInMonth(extra, '2026-10'), 15 + 42 + 1800 + 300)
    assert.equal(inflowInMonth(extra, '2026-10'), 100 + 18 + 2400)
    assert.equal(inflowTotal(extra, null), 100 + 18 + 2400)

    const [october] = breakdownByMonth(extra, ['2026-10'])
    assert.equal(october?.out, 15 + 42 + 1800 + 300)
    assert.equal(october?.in, 100 + 18 + 2400)
    assert.deepEqual(
      october?.categories.map((row) => [row.label, row.out, row.in]),
      [
        ['Income', 0, 2400],
        ['Rent', 1800, 0],
        ['Investments', 300, 0],
        ['Food', 10, 100],
        ['Venmo', 42, 18],
        ['Coffee', 5, 0],
      ],
    )
    assert.equal(october?.accounts[0]?.label, 'Sapphire ••4242')
    assert.equal(october?.accounts[0]?.out, 15 + 42 + 1800 + 300)
    assert.equal(october?.accounts[0]?.in, 100 + 18 + 2400)
  })
})
