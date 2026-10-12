import { daysAgo } from './months.ts'
import type { Snapshot, Transaction } from './types.ts'

const sapphire = {
  accountId: 'sample-sapphire',
  accountName: 'Sapphire',
  mask: '4242',
}
const freedom = {
  accountId: 'sample-freedom',
  accountName: 'Freedom',
  mask: '1881',
}
const checking = {
  accountId: 'sample-checking',
  accountName: 'Checking',
  mask: '0091',
}

type Seed = {
  id: string
  account: typeof sapphire
  days: number
  name: string
  merchant?: string
  amount: number
  category: string
  source?: Transaction['source']
  override?: string
  pending?: boolean
  plaidCategory?: string
}

function row(seed: Seed): Transaction {
  const override = seed.override ?? ''
  return {
    id: seed.id,
    accountId: seed.account.accountId,
    accountName: seed.account.accountName,
    mask: seed.account.mask,
    date: daysAgo(seed.days),
    name: seed.name,
    merchant: seed.merchant ?? seed.name,
    amount: seed.amount,
    pending: seed.pending ?? false,
    plaidCategory: seed.plaidCategory ?? 'GENERAL_MERCHANDISE',
    categoryAuto: seed.category,
    categoryOverride: override,
    category: override || seed.category,
    source: seed.source ?? (override ? 'override' : 'rule'),
    removed: false,
  }
}

export function buildSampleSnapshot(now = new Date()): Snapshot {
  const transactions = [
    row({ id: 's1', account: sapphire, days: 1, name: 'Blue Bottle Coffee', amount: 6.75, category: 'Coffee', plaidCategory: 'FOOD_AND_DRINK' }),
    row({ id: 's2', account: sapphire, days: 2, name: 'Trader Joe\'s', amount: 54.18, category: 'Food', plaidCategory: 'FOOD_AND_DRINK' }),
    row({ id: 's3', account: freedom, days: 3, name: 'Uber', merchant: 'Uber', amount: 24.6, category: 'Transport', plaidCategory: 'TRANSPORTATION' }),
    row({ id: 's4', account: sapphire, days: 4, name: 'AMZN Mktp', merchant: 'Amazon', amount: 31.22, category: 'Shopping', override: 'Household', source: 'override', plaidCategory: 'GENERAL_MERCHANDISE' }),
    row({ id: 's5', account: checking, days: 5, name: 'Payroll', amount: -2400, category: 'Income', source: 'rule', plaidCategory: 'INCOME' }),
    row({ id: 's6', account: sapphire, days: 6, name: 'Netflix', amount: 15.49, category: 'Subscriptions', plaidCategory: 'ENTERTAINMENT' }),
    row({ id: 's7', account: checking, days: 8, name: 'Payment thank you', amount: 420, category: 'Payment', plaidCategory: 'LOAN_PAYMENTS' }),
    row({ id: 's8', account: freedom, days: 9, name: 'Spotify', amount: 11.99, category: 'Subscriptions', plaidCategory: 'ENTERTAINMENT' }),
    row({ id: 's9', account: sapphire, days: 12, name: 'Delta', merchant: 'Delta Air Lines', amount: 286.4, category: 'Travel', plaidCategory: 'TRAVEL' }),
    row({ id: 's10', account: sapphire, days: 0, name: 'Starbucks', amount: 7.15, category: 'Coffee', pending: true, plaidCategory: 'FOOD_AND_DRINK' }),
    row({ id: 's11', account: checking, days: 75, name: 'Rent', amount: 1800, category: 'Housing', plaidCategory: 'RENT_AND_UTILITIES' }),
    row({ id: 's12', account: freedom, days: 18, name: 'Whole Foods', amount: 62.04, category: 'Food', plaidCategory: 'FOOD_AND_DRINK' }),
    row({ id: 's13', account: sapphire, days: 36, name: 'REI', amount: 89, category: 'Shopping', plaidCategory: 'GENERAL_MERCHANDISE' }),
    row({ id: 's14', account: freedom, days: 40, name: 'Lyft', merchant: 'Lyft', amount: 18.25, category: 'Transport', plaidCategory: 'TRANSPORTATION' }),
    row({ id: 's15', account: sapphire, days: 48, name: 'Sweetgreen', amount: 16.8, category: 'Food', plaidCategory: 'FOOD_AND_DRINK' }),
    row({ id: 's16', account: checking, days: 50, name: 'Payroll', amount: -2400, category: 'Income', plaidCategory: 'INCOME' }),
    row({ id: 's17', account: sapphire, days: 70, name: 'CVS', amount: 22.41, category: 'Health', plaidCategory: 'MEDICAL' }),
    row({ id: 's18', account: freedom, days: 95, name: 'AMC', amount: 32, category: 'Entertainment', plaidCategory: 'ENTERTAINMENT' }),
  ]

  return {
    sheetConfigured: false,
    plaidConfigured: false,
    missing: [],
    serviceAccountEmail: null,
    plaidEnv: null,
    syncedAt: now.toISOString(),
    linkedItems: 0,
    sample: true,
    accounts: [
      {
        itemId: 'sample-item',
        institution: 'Sample Bank',
        accountId: sapphire.accountId,
        accountName: sapphire.accountName,
        mask: sapphire.mask,
        type: 'credit',
        subtype: 'credit card',
        lastSynced: now.toISOString(),
      },
      {
        itemId: 'sample-item',
        institution: 'Sample Bank',
        accountId: freedom.accountId,
        accountName: freedom.accountName,
        mask: freedom.mask,
        type: 'credit',
        subtype: 'credit card',
        lastSynced: now.toISOString(),
      },
      {
        itemId: 'sample-item',
        institution: 'Sample Bank',
        accountId: checking.accountId,
        accountName: checking.accountName,
        mask: checking.mask,
        type: 'depository',
        subtype: 'checking',
        lastSynced: now.toISOString(),
      },
    ],
    transactions,
  }
}
