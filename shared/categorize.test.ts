import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { categorize, countsAsInflow, countsAsSpend, flowCategory, isVenmo } from './categorize.ts'
import { DEFAULT_RULES } from './constants.ts'
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

  it('puts flights and bookings in Travel even when Plaid calls them shopping', () => {
    const flight = categorize(
      {
        name: 'DELTA AIR 006',
        merchant: 'Delta Air Lines',
        plaidCategory: 'GENERAL_MERCHANDISE',
        categoryOverride: '',
      },
      DEFAULT_RULES,
    )
    assert.equal(flight.category, 'Travel')
    assert.equal(flight.source, 'rule')

    const stay = categorize(
      {
        name: 'AIRBNB * HM XYZ',
        merchant: 'Airbnb',
        plaidCategory: 'GENERAL_MERCHANDISE',
        categoryOverride: '',
      },
      DEFAULT_RULES,
    )
    assert.equal(stay.category, 'Travel')
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

  it('counts venmo, rent, and brokerage even when Plaid calls them transfers', () => {
    const venmoOut = { ...base, category: 'Transfer', name: 'VENMO PAYMENT', merchant: 'Venmo' }
    assert.equal(countsAsSpend(venmoOut), true)
    assert.equal(flowCategory(venmoOut), 'Venmo')
    const venmoIn = { ...venmoOut, amount: -15 }
    assert.equal(countsAsSpend(venmoIn), false)
    assert.equal(countsAsInflow(venmoIn), true)

    const rent = { ...base, category: 'Transfer', name: 'Apartment rent', merchant: 'Landlord' }
    assert.equal(countsAsSpend(rent), true)
    assert.equal(flowCategory(rent), 'Rent')

    const stock = { ...base, category: 'Transfer', name: 'Schwab Brokerage', merchant: 'Charles Schwab' }
    assert.equal(countsAsSpend(stock), true)
    assert.equal(flowCategory(stock), 'Investments')
    assert.equal(countsAsInflow({ ...stock, amount: -80 }), true)
  })

  it('still skips card payments, internal transfers, and car rentals', () => {
    assert.equal(
      countsAsSpend({ ...base, category: 'Payment', name: 'Payment thank you', merchant: 'Chase' }),
      false,
    )
    assert.equal(
      countsAsSpend({ ...base, category: 'Transfer', name: 'Online transfer', merchant: 'Bank' }),
      false,
    )
    assert.equal(
      countsAsInflow({ ...base, amount: -40, category: 'Transfer', name: 'Online transfer', merchant: 'Bank' }),
      false,
    )
    assert.equal(
      countsAsSpend({ ...base, category: 'Transfer', name: 'Enterprise Rent-A-Car', merchant: 'Enterprise' }),
      false,
    )
  })

  it('counts paychecks as money in', () => {
    const paycheck = { ...base, amount: -2400, category: 'Income', name: 'Payroll', merchant: 'Payroll' }
    assert.equal(countsAsSpend(paycheck), false)
    assert.equal(countsAsInflow(paycheck), true)
    assert.equal(flowCategory(paycheck), 'Income')
  })

  it('detects venmo from the merchant or name', () => {
    assert.equal(isVenmo({ name: 'venmo cashout', merchant: '' }), true)
    assert.equal(isVenmo({ name: 'Coffee', merchant: 'Blue Bottle' }), false)
  })
})
