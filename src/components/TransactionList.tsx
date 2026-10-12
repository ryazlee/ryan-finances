import type { Transaction } from '../../shared/types'
import { formatDay, formatMoney } from '../utils/format'

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

export default function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="notice">Nothing matches this filter.</p>
  }

  const visible = transactions.slice(0, VISIBLE_LIMIT)
  const hidden = transactions.length - visible.length

  return (
    <div className="tx-groups">
      {groupByDate(visible).map(([date, rows]) => (
        <section key={date} className="tx-group">
          <h3 className="tx-group__date">{formatDay(date)}</h3>
          <div>
            {rows.map((tx) => {
              const inflow = tx.amount < 0
              return (
                <article className="tx" key={tx.id}>
                  <div className="tx__copy">
                    <div className="tx__name">{tx.merchant || tx.name}</div>
                    <p className="tx__meta">
                      <span>{tx.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{tx.mask ? `${tx.accountName} ••${tx.mask}` : tx.accountName}</span>
                      {tx.pending ? <span className="badge">Pending</span> : null}
                      {tx.source === 'override' ? <span className="badge">Override</span> : null}
                    </p>
                  </div>
                  <div className={inflow ? 'tx__amount tx__amount--in' : 'tx__amount'}>
                    {inflow ? `+${formatMoney(Math.abs(tx.amount))}` : formatMoney(tx.amount)}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
      {hidden > 0 ? (
        <p className="notice">Showing the first {VISIBLE_LIMIT}. Narrow the month to see the rest.</p>
      ) : null}
    </div>
  )
}
