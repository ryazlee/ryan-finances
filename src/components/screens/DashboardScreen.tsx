import { Landmark, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { spendByAccount, spendByCategory, spendByMonthStacked, spendInMonth, transactionCount } from '../../../shared/aggregate'
import { isRolledUp } from '../../../shared/condense'
import { DETAIL_MONTHS } from '../../../shared/constants'
import { recentMonths, shiftMonth } from '../../../shared/months'
import AppHeader from '../AppHeader'
import AppShell from '../AppShell'
import Button from '../Button'
import HorizontalBars from '../HorizontalBars'
import MakerCredit from '../MakerCredit'
import MonthChart from '../MonthChart'
import SectionCard from '../SectionCard'
import SignOutButton from '../SignOutButton'
import TransactionList from '../TransactionList'
import { APP_TAGLINE } from '../../constants'
import { useSnapshot } from '../../hooks/snapshot'
import { useSync } from '../../hooks/useSync'
import { formatMoney, formatMonth, formatMonthShort, formatSynced } from '../../utils/format'
import type { Transaction } from '../../../shared/types'

type SortKey = 'newest' | 'oldest' | 'high' | 'low' | 'account'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'high', label: 'Highest' },
  { key: 'low', label: 'Lowest' },
  { key: 'account', label: 'Card' },
]

function compareTransactions(sort: SortKey, a: Transaction, b: Transaction): number {
  if (sort === 'oldest') return a.date.localeCompare(b.date) || b.amount - a.amount
  if (sort === 'high') return b.amount - a.amount || b.date.localeCompare(a.date)
  if (sort === 'low') return a.amount - b.amount || b.date.localeCompare(a.date)
  if (sort === 'account') {
    return a.accountName.localeCompare(b.accountName) || a.mask.localeCompare(b.mask) || b.date.localeCompare(a.date)
  }
  return b.date.localeCompare(a.date) || b.amount - a.amount
}

export default function DashboardScreen() {
  const { view, remote, loading, error, refreshingBanks, usingSample, showSample, hideSample } = useSnapshot()
  const { sync, syncing, message, failed, enabled } = useSync()
  const months = useMemo(() => recentMonths(12), [])
  const current = months[months.length - 1] ?? months[0] ?? ''
  const [month, setMonth] = useState(current)
  const [accountId, setAccountId] = useState('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [query, setQuery] = useState('')

  const transactions = view?.transactions ?? []
  const accounts = useMemo(() => {
    const labels = new Map<string, string>()
    for (const account of view?.accounts ?? []) {
      labels.set(account.accountId, account.mask ? `${account.accountName} ••${account.mask}` : account.accountName)
    }
    for (const tx of transactions) {
      if (!labels.has(tx.accountId)) {
        labels.set(tx.accountId, tx.mask ? `${tx.accountName} ••${tx.mask}` : tx.accountName)
      }
    }
    return [...labels.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [transactions, view?.accounts])
  const scoped = accountId === 'all' ? transactions : transactions.filter((tx) => tx.accountId === accountId)
  const selected = month === 'all' ? null : month
  const categories = spendByCategory(scoped, selected)
  const cards = spendByAccount(transactions, selected)
  const byMonth = spendByMonthStacked(scoped, months)
  const primaryMonth = month === 'all' ? current : month
  const primarySpend = spendInMonth(scoped, primaryMonth)
  const priorSpend = spendInMonth(scoped, shiftMonth(primaryMonth, -1))
  const periodTransactions = scoped.filter((tx) => month === 'all' || tx.date.startsWith(month))
  const rolledUp = periodTransactions.some(isRolledUp)
  const queryText = query.trim().toLowerCase()
  const listed = periodTransactions
    .filter((tx) => {
      if (!queryText) return true
      return `${tx.name} ${tx.merchant} ${tx.category} ${tx.accountName} ${tx.mask}`
        .toLowerCase()
        .includes(queryText)
    })
    .sort((a, b) => compareTransactions(sort, a, b))
  const hasRows = usingSample || transactions.length > 0
  const synced = formatSynced(view?.syncedAt ?? null)
  const delta = priorSpend > 0 ? Math.round(((primarySpend - priorSpend) / priorSpend) * 100) : null
  const versus = delta == null ? null : `${delta > 0 ? '+' : ''}${delta}% vs prior month`

  return (
    <AppShell
      header={(
        <AppHeader subtitle={APP_TAGLINE}>
          {enabled ? (
            <Button
              label={syncing ? 'Syncing…' : 'Sync'}
              variant="ghost"
              icon={<RefreshCw size={16} />}
              onClick={() => void sync()}
              disabled={syncing}
            />
          ) : null}
          <Button label="Banks" variant="ghost" to="/connect" icon={<Landmark size={16} />} />
          <SignOutButton />
        </AppHeader>
      )}
    >
      <MakerCredit />

      {usingSample ? (
        <div className="banner">
          <p className="notice">Sample data, so you can look around before connecting a bank.</p>
          <Button label="Hide sample" variant="secondary" onClick={hideSample} />
        </div>
      ) : null}

      {refreshingBanks && hasRows ? <p className="notice">Fetching your banks…</p> : null}
      {message ? <p className={failed ? 'notice notice--error' : 'notice'}>{message}</p> : null}
      {error && !usingSample ? <p className="notice notice--error">{error}</p> : null}
      {remote?.plaidEnv === 'sandbox' && !usingSample && remote.sheetConfigured ? (
        <p className="notice">Sandbox mode uses Plaid&apos;s fake bank, not your real cards.</p>
      ) : null}

      {loading && !view ? <p className="notice">Loading your sheet…</p> : null}

      {!loading && !hasRows && refreshingBanks ? (
        <SectionCard title="Fetching your banks">
          <p className="notice">Pulling accounts and transactions from the banks you already linked.</p>
        </SectionCard>
      ) : null}

      {!loading && !hasRows && !refreshingBanks ? (
        <SectionCard title="Nothing imported yet">
          <div className="stack">
            <p className="notice">
              {remote?.linkedItems
                ? 'Your bank is saved. Use Sync to pull transactions into the sheet.'
                : remote?.sheetConfigured
                  ? 'Link a bank once. Later visits fetch it automatically.'
                  : 'Add your Plaid and Google keys, then link a bank. You can preview the dashboard with sample purchases first.'}
            </p>
            {remote?.missing.length ? (
              <p className="notice">Still needed: {remote.missing.join(', ')}</p>
            ) : null}
            <div className="action-row">
              <Button label="Set up banks" to="/connect" />
              <Button label="Preview with sample data" variant="secondary" onClick={showSample} />
            </div>
          </div>
        </SectionCard>
      ) : null}

      {hasRows ? (
        <>
          <div className="stat-grid">
            <article className="surface-card stat">
              <p className="stat__label">{month === 'all' ? 'This month' : formatMonth(primaryMonth)}</p>
              <p className="stat__value">{formatMoney(primarySpend)}</p>
              {versus ? (
                <p className={delta != null && delta > 0 ? 'stat__meta stat__meta--up' : 'stat__meta stat__meta--down'}>{versus}</p>
              ) : (
                <p className="stat__meta">Spend, excluding payments</p>
              )}
            </article>
            <article className="surface-card stat">
              <p className="stat__label">Prior month</p>
              <p className="stat__value">{formatMoney(priorSpend)}</p>
              <p className="stat__meta">{formatMonth(shiftMonth(primaryMonth, -1))}</p>
            </article>
            <article className="surface-card stat">
              <p className="stat__label">Transactions</p>
              <p className="stat__value">{transactionCount(periodTransactions)}</p>
              <p className="stat__meta">{synced ? `Synced ${synced}` : 'Not synced yet'}</p>
            </article>
          </div>

          <div className="filter-block">
            <p className="field__label">Month</p>
            <div className="chip-row">
              <button
                type="button"
                className={month === 'all' ? 'chip chip--active' : 'chip'}
                aria-pressed={month === 'all'}
                onClick={() => setMonth('all')}
              >
                All
              </button>
              {months.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={month === key ? 'chip chip--active' : 'chip'}
                  aria-pressed={month === key}
                  onClick={() => setMonth(key)}
                >
                  {formatMonthShort(key)}
                </button>
              ))}
            </div>
          </div>

          {accounts.length > 0 ? (
            <div className="filter-block">
              <p className="field__label">Card</p>
              <div className="chip-row">
                <button
                  type="button"
                  className={accountId === 'all' ? 'chip chip--active' : 'chip'}
                  aria-pressed={accountId === 'all'}
                  onClick={() => setAccountId('all')}
                >
                  All cards
                </button>
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    className={accountId === account.id ? 'chip chip--active' : 'chip'}
                    aria-pressed={accountId === account.id}
                    onClick={() => setAccountId(account.id)}
                  >
                    {account.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="dash-grid">
            <SectionCard title="Spend by category">
              <HorizontalBars rows={categories} />
            </SectionCard>
            <SectionCard title="Per card">
              <HorizontalBars
                rows={cards}
                selectedKey={accountId === 'all' ? null : accountId}
                onSelect={(key) => setAccountId((currentId) => (currentId === key ? 'all' : key))}
              />
            </SectionCard>
          </div>

          <SectionCard title="Expenditure over months">
            <MonthChart
              rows={byMonth}
              selected={selected}
              onSelect={(key) => setMonth((currentMonth) => (currentMonth === key ? 'all' : key))}
            />
          </SectionCard>

          <SectionCard
            title="What you bought"
            action={(
              <label className="search">
                <span className="sr-only">Search transactions</span>
                <input
                  className="input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search merchants"
                  type="search"
                />
              </label>
            )}
          >
            <div className="stack">
              {rolledUp ? (
                <p className="notice">
                  {month === 'all'
                    ? `Individual purchases stay for this month and the ${DETAIL_MONTHS} before it. Older months are totals by category and card.`
                    : 'This month is stored as totals by category and card.'}
                </p>
              ) : null}
              <div className="filter-block">
                <p className="field__label">Sort</p>
                <div className="chip-row" role="group" aria-label="Sort transactions">
                  {SORTS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={sort === option.key ? 'chip chip--active' : 'chip'}
                      aria-pressed={sort === option.key}
                      onClick={() => setSort(option.key)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <TransactionList transactions={listed} />
            </div>
          </SectionCard>
        </>
      ) : null}
    </AppShell>
  )
}
