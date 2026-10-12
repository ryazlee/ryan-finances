import { Landmark, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { spendByAccount, spendByCategory, spendByMonth, spendInMonth } from '../../../shared/aggregate'
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

export default function DashboardScreen() {
  const { view, remote, loading, error, usingSample, showSample, hideSample } = useSnapshot()
  const { sync, syncing, message, failed, enabled } = useSync()
  const months = useMemo(() => recentMonths(12), [])
  const current = months[months.length - 1] ?? months[0] ?? ''
  const [month, setMonth] = useState(current)
  const [query, setQuery] = useState('')

  const transactions = view?.transactions ?? []
  const selected = month === 'all' ? null : month
  const categories = spendByCategory(transactions, selected)
  const cards = spendByAccount(transactions, selected)
  const byMonth = spendByMonth(transactions, months)
  const primaryMonth = month === 'all' ? current : month
  const primarySpend = spendInMonth(transactions, primaryMonth)
  const priorSpend = spendInMonth(transactions, shiftMonth(primaryMonth, -1))
  const periodTransactions = transactions.filter((tx) => month === 'all' || tx.date.startsWith(month))
  const queryText = query.trim().toLowerCase()
  const listed = periodTransactions
    .filter((tx) => {
      if (!queryText) return true
      return `${tx.name} ${tx.merchant} ${tx.category} ${tx.accountName} ${tx.mask}`
        .toLowerCase()
        .includes(queryText)
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount)
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

      {message ? <p className={failed ? 'notice notice--error' : 'notice'}>{message}</p> : null}
      {error && !usingSample ? <p className="notice notice--error">{error}</p> : null}
      {remote?.plaidEnv === 'sandbox' && !usingSample && remote.sheetConfigured ? (
        <p className="notice">Sandbox mode uses Plaid&apos;s fake bank, not your real cards.</p>
      ) : null}

      {loading && !view ? <p className="notice">Loading your sheet…</p> : null}

      {!loading && !hasRows ? (
        <SectionCard title="Nothing imported yet">
          <div className="stack">
            <p className="notice">
              {remote?.sheetConfigured
                ? 'Link a bank to pull transactions into the sheet.'
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
              {versus ? <p className="stat__meta">{versus}</p> : <p className="stat__meta">Spend, excluding payments</p>}
            </article>
            <article className="surface-card stat">
              <p className="stat__label">Prior month</p>
              <p className="stat__value">{formatMoney(priorSpend)}</p>
              <p className="stat__meta">{formatMonth(shiftMonth(primaryMonth, -1))}</p>
            </article>
            <article className="surface-card stat">
              <p className="stat__label">Transactions</p>
              <p className="stat__value">{periodTransactions.length}</p>
              <p className="stat__meta">{synced ? `Synced ${synced}` : 'Not synced yet'}</p>
            </article>
          </div>

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

          <div className="dash-grid">
            <SectionCard title="Spend by category">
              <HorizontalBars rows={categories} />
            </SectionCard>
            <SectionCard title="Per card">
              <HorizontalBars rows={cards} />
            </SectionCard>
          </div>

          <SectionCard title="Expenditure over months">
            <MonthChart rows={byMonth} selected={selected} />
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
            <TransactionList transactions={listed} />
          </SectionCard>
        </>
      ) : null}
    </AppShell>
  )
}
