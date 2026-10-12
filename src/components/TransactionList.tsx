import { isInvestmentActivity, isRentActivity, isVenmo } from '../../shared/categorize'
import { isRolledUp } from '../../shared/condense'
import type { Transaction } from '../../shared/types'
import CategoryPicker from './CategoryPicker'
import { AccountMark } from '../utils/marks'
import { formatDay, formatMoney, formatMonth } from '../utils/format'

const VISIBLE_LIMIT = 200

function groupByDate(transactions: Transaction[]): [string, Transaction[]][] {
  const groups = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    const list = groups.get(tx.date) ?? []
    list.push(tx)
    groups.set(tx.date, list)
  }
  return [...groups.entries()]
}

export default function TransactionList({
  transactions,
  categories,
  accountType,
  savingId,
  onCategorize,
}: {
  transactions: Transaction[]
  categories: string[]
  accountType: (id: string) => string
  savingId: string | null
  onCategorize: (transaction: Transaction, category: string) => Promise<void>
}) {
  if (transactions.length === 0) {
    return <p className="notice">Nothing matches this filter.</p>
  }

  const visible = transactions.slice(0, VISIBLE_LIMIT)
  const hidden = transactions.length - visible.length

  return (
    <div className="tx-groups">
      {groupByDate(visible).map(([date, rows]) => (
        <section key={date} className="tx-group">
          <h3 className="tx-group__date">
            {rows.every(isRolledUp) ? formatMonth(date.slice(0, 7)) : formatDay(date)}
          </h3>
          <div>
            {rows.map((tx) => {
              const inflow = tx.amount < 0
              const venmo = isVenmo(tx)
              const rent = !venmo && isRentActivity(tx)
              const brokerage = !venmo && !rent && isInvestmentActivity(tx)
              return (
                <article className={venmo ? 'tx tx--venmo' : 'tx'} key={tx.id}>
                  <div className="tx__copy">
                    <div className="tx__name">
                      <span className="tx__name-text">{tx.merchant || tx.name}</span>
                      {venmo ? <span className="badge badge--venmo">Venmo</span> : null}
                      {rent ? <span className="badge badge--rent">Rent</span> : null}
                      {brokerage ? <span className="badge badge--broker">Brokerage</span> : null}
                    </div>
                    <div className="tx__meta">
                      <CategoryPicker
                        transaction={tx}
                        choices={categories}
                        saving={savingId === tx.id}
                        onSave={(category) => onCategorize(tx, category)}
                      />
                      <span className="tx__account">
                        <AccountMark id={tx.accountId} type={accountType(tx.accountId)} />
                        <span>{tx.mask ? `${tx.accountName} ••${tx.mask}` : tx.accountName}</span>
                      </span>
                      {tx.pending ? <span className="badge">Pending</span> : null}
                      {tx.source === 'override' ? <span className="badge">Pinned</span> : null}
                    </div>
                  </div>
                  <div className={inflow ? 'tx__amount tx__amount--in' : 'tx__amount'}>
                    <span className="tx__way">{inflow ? 'In' : 'Out'}</span>
                    <span>{inflow ? `+${formatMoney(Math.abs(tx.amount))}` : formatMoney(tx.amount)}</span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
      {hidden > 0 ? (
        <p className="notice">Showing the first {VISIBLE_LIMIT}. Narrow the dates to see the rest.</p>
      ) : null}
    </div>
  )
}
