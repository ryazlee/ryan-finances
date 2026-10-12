export type RuleField = 'name' | 'merchant' | 'plaid_category'

export type CategorySource = 'override' | 'rule' | 'plaid'

export type Rule = {
  priority: number
  field: RuleField
  pattern: string
  category: string
}

export type Account = {
  itemId: string
  institution: string
  accountId: string
  accountName: string
  mask: string
  type: string
  subtype: string
  lastSynced: string | null
}

export type Transaction = {
  id: string
  accountId: string
  accountName: string
  mask: string
  date: string
  name: string
  merchant: string
  amount: number
  pending: boolean
  plaidCategory: string
  categoryAuto: string
  categoryOverride: string
  category: string
  source: CategorySource
  removed: boolean
  /** Present on a rolled-up month total. A single purchase leaves this unset. */
  count?: number
}

export type Snapshot = {
  sheetConfigured: boolean
  plaidConfigured: boolean
  missing: string[]
  serviceAccountEmail: string | null
  plaidEnv: 'sandbox' | 'production' | null
  syncedAt: string | null
  linkedItems: number
  accounts: Account[]
  transactions: Transaction[]
  sample?: boolean
}

export type SyncCounts = {
  added: number
  modified: number
  removed: number
  accounts: number
}
