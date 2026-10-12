import { Landmark, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  breakdownByMonth,
  inflowTotal,
  outflowTotal,
  spendByAccount,
  spendByCategory,
  spendByMonthStacked,
  transactionCount,
} from '../../../shared/aggregate'
import { flowCategory } from '../../../shared/categorize'
import { isRolledUp } from '../../../shared/condense'
import { DEFAULT_RULES, DETAIL_MONTHS } from '../../../shared/constants'
import {
  dayCount,
  formatPeriod,
  includesDate,
  monthRange,
  monthsInRange,
  presetForRange,
  previousRange,
  rangeForPreset,
  type DateRange,
  type RangePreset,
} from '../../../shared/range'
import Accordion from '../Accordion'
import AppHeader from '../AppHeader'
import AppShell from '../AppShell'
import Button from '../Button'
import HorizontalBars from '../HorizontalBars'
import MakerCredit from '../MakerCredit'
import MonthBreakdowns from '../MonthBreakdowns'
import DateRangeBar from '../DateRangeBar'
import MonthChart from '../MonthChart'
import SectionCard from '../SectionCard'
import SignOutButton from '../SignOutButton'
import TransactionList from '../TransactionList'
import { APP_TAGLINE } from '../../constants'
import { useSnapshot } from '../../hooks/snapshot'
import { useSync } from '../../hooks/useSync'
import { formatMoney, formatSynced } from '../../utils/format'
import { AccountMark, CategoryMark } from '../../utils/marks'
import type { Transaction } from '../../../shared/types'

type SortKey = 'newest' | 'oldest' | 'high' | 'low' | 'account'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'high', label: 'Highest' },
  { key: 'low', label: 'Lowest' },
  { key: 'account', label: 'Account' },
]

function centerActiveChip(row: HTMLDivElement | null) {
  if (!row) return
  const active = row.querySelector<HTMLElement>('.chip--active')
  if (!active) return
  const left = active.offsetLeft - row.clientWidth / 2 + active.clientWidth / 2
  row.scrollTo({ left: Math.max(0, left) })
}

function compareTransactions(sort: SortKey, a: Transaction, b: Transaction): number {
  if (sort === 'oldest') return a.date.localeCompare(b.date) || b.amount - a.amount
  if (sort === 'high') return b.amount - a.amount || b.date.localeCompare(a.date)
  if (sort === 'low') return a.amount - b.amount || b.date.localeCompare(a.date)
  if (sort === 'account') {
    return a.accountName.localeCompare(b.accountName) || a.mask.localeCompare(b.mask) || b.date.localeCompare(a.date)
  }
  return b.date.localeCompare(a.date) || b.amount - a.amount
}

function priorPhrase(days: number): string {
  if (days === 1) return 'vs yesterday'
  return `vs prior ${days} days`
}

export default function DashboardScreen() {
  const { view, remote, loading, error, refreshingBanks, usingSample, showSample, hideSample, setCategory: saveCategory } = useSnapshot()
  const { sync, syncing, message, failed, enabled } = useSync()
  const [preset, setPreset] = useState<RangePreset>('30')
  const [range, setRange] = useState<DateRange>(() => rangeForPreset('30'))
  const [accountId, setAccountId] = useState('all')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [query, setQuery] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const cardRowRef = useRef<HTMLDivElement>(null)

  function choosePreset(next: Exclude<RangePreset, 'custom'>) {
    setPreset(next)
    setRange(rangeForPreset(next))
  }

  function chooseRange(next: DateRange) {
    if (!next.start || !next.end || next.start > next.end) return
    setRange(next)
    setPreset(presetForRange(next))
  }

  function chooseMonth(key: string) {
    const bounds = monthRange(key)
    if (range.start === bounds.start && range.end === bounds.end) {
      choosePreset('30')
      return
    }
    chooseRange(bounds)
  }

  const transactions = view?.transactions ?? []
  const accounts = useMemo(() => {
    const labels = new Map<string, { label: string; type: string }>()
    for (const account of view?.accounts ?? []) {
      labels.set(account.accountId, {
        label: account.mask ? `${account.accountName} ••${account.mask}` : account.accountName,
        type: account.type,
      })
    }
    for (const tx of view?.transactions ?? []) {
      if (!labels.has(tx.accountId)) {
        labels.set(tx.accountId, {
          label: tx.mask ? `${tx.accountName} ••${tx.mask}` : tx.accountName,
          type: '',
        })
      }
    }
    return [...labels.entries()]
      .map(([id, account]) => ({ id, label: account.label, type: account.type }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [view?.accounts, view?.transactions])
  const accountType = (id: string) => accounts.find((account) => account.id === id)?.type ?? ''
  const accountScoped = accountId === 'all' ? transactions : transactions.filter((tx) => tx.accountId === accountId)
  const inPeriod = accountScoped.filter((tx) => includesDate(range, tx.date))
  const categoryOptions = [...inPeriod.reduce((totals, tx) => {
    const label = flowCategory(tx)
    totals.set(label, (totals.get(label) ?? 0) + Math.abs(tx.amount))
    return totals
  }, new Map<string, number>()).entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label]) => label)
  const categoryChoices = useMemo(() => {
    const names = new Set(DEFAULT_RULES.map((rule) => rule.category))
    for (const tx of view?.transactions ?? []) {
      const label = tx.category.trim()
      if (label) names.add(label)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [view?.transactions])
  const scoped = category === 'all' ? accountScoped : accountScoped.filter((tx) => flowCategory(tx) === category)
  const viewed = scoped.filter((tx) => includesDate(range, tx.date))
  const prior = previousRange(range)
  const priorViewed = prior ? scoped.filter((tx) => includesDate(prior, tx.date)) : []
  const span = monthsInRange(range)
  const chartMonths = (span === 'open'
    ? [...new Set(viewed.map((tx) => tx.date.slice(0, 7)))]
    : span
  ).sort().slice(-24)
  const highlighted = span !== 'open' && span.length === 1 && range.start === monthRange(span[0] ?? '').start && range.end === monthRange(span[0] ?? '').end
    ? span[0] ?? null
    : null
  const categories = spendByCategory(viewed, null)
  const cards = spendByAccount(
    (category === 'all' ? transactions : transactions.filter((tx) => flowCategory(tx) === category))
      .filter((tx) => includesDate(range, tx.date)),
    null,
  )
  const byMonth = spendByMonthStacked(viewed, chartMonths).filter((row) => row.amount > 0 || highlighted === row.key)
  const monthFlows = breakdownByMonth(viewed, chartMonths)
  const periodLabel = formatPeriod(preset, range)
  const periodOut = outflowTotal(viewed, null)
  const periodIn = inflowTotal(viewed, null)
  const priorOut = outflowTotal(priorViewed, null)
  const priorIn = inflowTotal(priorViewed, null)
  const periodTransactions = viewed
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
  const delta = prior && priorOut > 0 ? Math.round(((periodOut - priorOut) / priorOut) * 100) : null
  const versus = delta == null ? null : `${delta > 0 ? '+' : ''}${delta}% ${priorPhrase(dayCount(range))}`
  const scopeLabel = [periodLabel, category === 'all' ? null : category].filter(Boolean).join(' · ')
  const categoryChips = category !== 'all' && !categoryOptions.includes(category)
    ? [category, ...categoryOptions]
    : categoryOptions

  async function categorize(tx: Transaction, next: string) {
    setCategoryError(null)
    setSavingId(tx.id)
    try {
      await saveCategory(tx.id, next)
    } catch (caught) {
      setCategoryError(caught instanceof Error ? caught.message : 'Could not save the category.')
    } finally {
      setSavingId(null)
    }
  }

  useEffect(() => {
    centerActiveChip(cardRowRef.current)
  }, [accountId, hasRows, accounts.length])

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
            <article className="surface-card stat stat--lead">
              <p className="stat__label">Money out{scopeLabel ? ` · ${scopeLabel}` : ''}</p>
              <p className="stat__value">{formatMoney(periodOut)}</p>
              {versus ? (
                <p className={delta != null && delta > 0 ? 'stat__meta stat__meta--up' : 'stat__meta stat__meta--down'}>{versus}</p>
              ) : (
                <p className="stat__meta">{periodLabel}</p>
              )}
            </article>
            <article className="surface-card stat stat--in">
              <p className="stat__label">Money in{scopeLabel ? ` · ${scopeLabel}` : ''}</p>
              <p className="stat__value">{formatMoney(periodIn)}</p>
              <p className="stat__meta">{prior ? `Prior ${formatMoney(priorIn)}` : periodLabel}</p>
            </article>
            <article className="surface-card stat">
              <p className="stat__label">Transactions</p>
              <p className="stat__value">{transactionCount(periodTransactions)}</p>
              <p className="stat__meta">{synced ? `Synced ${synced}` : 'Not synced yet'}</p>
            </article>
          </div>

          <SectionCard title="Filters">
            <div className="stack">
              <div className="filter-block">
                <p className="field__label">Time</p>
                <DateRangeBar range={range} preset={preset} onPreset={choosePreset} onRange={chooseRange} />
              </div>

              {accounts.length > 0 ? (
                <div className="filter-block">
                  <p className="field__label">Account</p>
                  <div className="chip-row" ref={cardRowRef}>
                    <button
                      type="button"
                      className={accountId === 'all' ? 'chip chip--active' : 'chip'}
                      aria-pressed={accountId === 'all'}
                      onClick={() => setAccountId('all')}
                    >
                      All accounts
                    </button>
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        className={accountId === account.id ? 'chip chip--active' : 'chip'}
                        aria-pressed={accountId === account.id}
                      onClick={() => setAccountId(account.id)}
                    >
                      <AccountMark id={account.id} type={account.type} />
                      {account.label}
                    </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {categoryOptions.length > 0 ? (
                <div className="filter-block">
                  <p className="field__label">Category</p>
                  <div className="chip-row">
                    <button
                      type="button"
                      className={category === 'all' ? 'chip chip--active' : 'chip'}
                      aria-pressed={category === 'all'}
                      onClick={() => setCategory('all')}
                    >
                      All categories
                    </button>
                    {categoryChips.map((label) => (
                      <button
                        key={label}
                        type="button"
                        className={category === label ? 'chip chip--active' : 'chip'}
                        aria-pressed={category === label}
                      onClick={() => setCategory(label)}
                    >
                      <CategoryMark name={label} />
                      {label}
                    </button>
                    ))}
                  </div>
                </div>
              ) : null}

            </div>
          </SectionCard>

          <SectionCard title="Money out by month">
            <MonthChart
              rows={byMonth}
              selected={highlighted}
              onSelect={chooseMonth}
            />
          </SectionCard>

          <div className="dash-grid">
            <SectionCard title="By category">
              <HorizontalBars
                kind="category"
                rows={category === 'all' ? categories : categories.filter((row) => row.key === category)}
                selectedKey={category === 'all' ? null : category}
                onSelect={(key) => setCategory((currentCategory) => (currentCategory === key ? 'all' : key))}
              />
            </SectionCard>
            <SectionCard title="By account">
              <HorizontalBars
                kind="account"
                accountType={accountType}
                rows={cards}
                selectedKey={accountId === 'all' ? null : accountId}
                onSelect={(key) => setAccountId((currentId) => (currentId === key ? 'all' : key))}
              />
            </SectionCard>
          </div>

          <SectionCard
            title="Transactions"
            action={<span className="section-meta">{listed.length}</span>}
          >
            <div className="stack">
              {categoryError ? <p className="notice notice--error">{categoryError}</p> : null}
              {rolledUp ? (
                <p className="notice">
                  Months older than {DETAIL_MONTHS} months are totals by category and card. Those totals stay as they were folded.
                </p>
              ) : null}
              <label className="filter-block">
                <span className="field__label">Search</span>
                <input
                  className="input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Merchant, category, or account"
                  type="search"
                />
              </label>
              <div className="filter-block">
                <p className="field__label">Sort</p>
                <div className="chip-row chip-row--wrap" role="group" aria-label="Sort transactions">
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
              <TransactionList
                transactions={listed}
                categories={categoryChoices}
                accountType={accountType}
                savingId={savingId}
                onCategorize={categorize}
              />
            </div>
          </SectionCard>

          <Accordion
            title="Categories each month"
            hint={periodLabel}
          >
            <MonthBreakdowns months={monthFlows} selected={highlighted} kind="categories" />
          </Accordion>

          <Accordion
            title="Accounts each month"
            hint={periodLabel}
          >
            <MonthBreakdowns
              months={monthFlows}
              selected={highlighted}
              kind="accounts"
              accountType={accountType}
            />
          </Accordion>
        </>
      ) : null}
    </AppShell>
  )
}
