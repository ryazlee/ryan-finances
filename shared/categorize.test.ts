import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { categorize, countsAsSpend } from './categorize.ts'
import type { Rule } from './types.ts'

const rules: Rule[] = [
  { priority: 10, field: 'name', pattern: 'Starbucks', category: 'Coffee' },
  { priority: 50, field: 'name', pattern: 'star', category: 'Too broad' },
  { priority: 20, field: 'merchant', pattern: 'uber', category: 'Transport' },
  { priority: 100, field: 'plaid_category', pattern: 'FOOD_AND_DRINK', category: 'Food' },
]

describe('categorize', () => {
  it('lets a manual override win over a matching rule', () => {
    const result = categorize(
      {
        name: 'Starbucks',
        merchant: 'Starbucks',
        plaidCategory: 'FOOD_AND_DRINK',
        categoryOverride: 'Treats',
      },
      rules,
    )
    assert.equal(result.category, 'Treats')
    assert.equal(result.auto, 'Coffee')
    assert.equal(result.source, 'override')
  })

  it('uses the lowest priority number, then sheet order', () => {
    const result = categorize(
      {
        name: 'Starbucks Reserve',
        merchant: '',
        plaidCategory: 'FOOD_AND_DRINK',
        categoryOverride: '',
      },
      rules,
    )
    assert.equal(result.category, 'Coffee')
    assert.equal(result.source, 'rule')
  })

  it('matches merchant substrings without case', () => {
    const result = categorize(
      {
        name: 'UBER TRIP',
        merchant: 'Uber',
        plaidCategory: 'TRANSPORTATION',
        categoryOverride: '  ',
      },
      rules,
    )
    assert.equal(result.category, 'Transport')
  })

  it('falls back to a readable Plaid category', () => {
    const result = categorize(
      {
        name: 'Corner store',
        merchant: '',
        plaidCategory: 'GENERAL_MERCHANDISE',
        categoryOverride: '',
      },
      [],
    )
    assert.equal(result.category, 'General Merchandise')
    assert.equal(result.source, 'plaid')
  })
})

describe('countsAsSpend', () => {
  const base = {
    amount: 12,
    category: 'Food',
    pending: false,
    removed: false,
  }

  it('counts posted outflows', () => {
    assert.equal(countsAsSpend(base), true)
  })

  it('skips payments, income, pending, and money in', () => {
    assert.equal(countsAsSpend({ ...base, category: 'Payment' }), false)
    assert.equal(countsAsSpend({ ...base, category: 'Income' }), false)
    assert.equal(countsAsSpend({ ...base, category: 'transfer' }), false)
    assert.equal(countsAsSpend({ ...base, pending: true }), false)
    assert.equal(countsAsSpend({ ...base, amount: -20 }), false)
    assert.equal(countsAsSpend({ ...base, removed: true }), false)
  })
})
