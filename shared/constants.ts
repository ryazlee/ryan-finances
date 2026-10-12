import type { Rule, RuleField } from './types.ts'

export const TX_HEADERS = [
  'transaction_id',
  'account_id',
  'account_name',
  'mask',
  'date',
  'name',
  'merchant',
  'amount',
  'pending',
  'plaid_category',
  'category_auto',
  'category_override',
  'category',
  'removed',
] as const

export const RULE_HEADERS = ['priority', 'field', 'pattern', 'category'] as const

export const ACCOUNT_HEADERS = [
  'item_id',
  'institution',
  'account_id',
  'account_name',
  'mask',
  'type',
  'subtype',
  'last_synced',
] as const

export const MONTHLY_HEADERS = [
  'month',
  'account_id',
  'account_name',
  'mask',
  'category',
  'direction',
  'amount',
  'count',
] as const

export const ARCHIVE_HEADERS = ['transaction_id'] as const

/** Current month plus this many previous months stay as individual purchases. */
export const DETAIL_MONTHS = 3

export const SHEET_TABS = {
  transactions: 'Transactions',
  rules: 'Rules',
  accounts: 'Accounts',
  monthly: 'Monthly',
  archived: 'Archived',
} as const

/**
 * Category names left out of everyday spending.
 * Payment and Transfer still count when the row is Venmo, rent, or brokerage activity.
 * Income stays out of money-out totals and counts as money in.
 */
export const EXCLUDED_SPEND = new Set(['transfer', 'payment', 'income'])

export const RULE_FIELDS: RuleField[] = ['name', 'merchant', 'plaid_category']

export const DEFAULT_RULES: Rule[] = [
  { priority: 10, field: 'name', pattern: 'starbucks', category: 'Coffee' },
  { priority: 10, field: 'name', pattern: 'dunkin', category: 'Coffee' },
  { priority: 20, field: 'merchant', pattern: 'uber', category: 'Transport' },
  { priority: 20, field: 'merchant', pattern: 'lyft', category: 'Transport' },
  { priority: 30, field: 'name', pattern: 'netflix', category: 'Subscriptions' },
  { priority: 30, field: 'name', pattern: 'spotify', category: 'Subscriptions' },
  { priority: 100, field: 'plaid_category', pattern: 'FOOD_AND_DRINK', category: 'Food' },
  { priority: 100, field: 'plaid_category', pattern: 'TRANSPORTATION', category: 'Transport' },
  { priority: 100, field: 'plaid_category', pattern: 'RENT_AND_UTILITIES', category: 'Housing' },
  { priority: 100, field: 'plaid_category', pattern: 'GENERAL_MERCHANDISE', category: 'Shopping' },
  { priority: 100, field: 'plaid_category', pattern: 'ENTERTAINMENT', category: 'Entertainment' },
  { priority: 100, field: 'plaid_category', pattern: 'PERSONAL_CARE', category: 'Personal' },
  { priority: 100, field: 'plaid_category', pattern: 'MEDICAL', category: 'Health' },
  { priority: 100, field: 'plaid_category', pattern: 'TRAVEL', category: 'Travel' },
  { priority: 100, field: 'plaid_category', pattern: 'GENERAL_SERVICES', category: 'Services' },
  { priority: 100, field: 'plaid_category', pattern: 'HOME_IMPROVEMENT', category: 'Home' },
  { priority: 100, field: 'plaid_category', pattern: 'BANK_FEES', category: 'Fees' },
  { priority: 100, field: 'plaid_category', pattern: 'LOAN_PAYMENTS', category: 'Payment' },
  { priority: 100, field: 'plaid_category', pattern: 'TRANSFER_IN', category: 'Transfer' },
  { priority: 100, field: 'plaid_category', pattern: 'TRANSFER_OUT', category: 'Transfer' },
  { priority: 100, field: 'plaid_category', pattern: 'INCOME', category: 'Income' },
]
