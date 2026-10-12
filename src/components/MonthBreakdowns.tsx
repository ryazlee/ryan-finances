import type { FlowSplit, MonthBreakdown } from '../../shared/aggregate'
import { formatMoney, formatMonth } from '../utils/format'

function FlowBadge({ label }: { label: string }) {
  if (label === 'Venmo') return <span className="badge badge--venmo">Venmo</span>
  if (label === 'Rent') return <span className="badge badge--rent">Rent</span>
  if (label === 'Investments') return <span className="badge badge--broker">Brokerage</span>
  return <span>{label}</span>
}

function DirectionLines({ rows, direction }: { rows: FlowSplit[]; direction: 'out' | 'in' }) {
  const visible = rows
    .filter((row) => row[direction] > 0)
    .sort((a, b) => b[direction] - a[direction] || a.label.localeCompare(b.label))
  if (visible.length === 0) {
    return <p className="month-break__empty">None</p>
  }
  return (
    <div className="flow-lines">
      {visible.map((row) => (
        <div className="flow-line" key={row.key}>
          <span className="flow-line__label">
            <FlowBadge label={row.label} />
          </span>
          <span className="flow-line__amount">{formatMoney(row[direction])}</span>
        </div>
      ))}
    </div>
  )
}

export default function MonthBreakdowns({
  months,
  selected,
  kind,
}: {
  months: MonthBreakdown[]
  selected: string | null
  kind: 'categories' | 'accounts'
}) {
  const visible = [...months].reverse().filter((month) => month.out > 0 || month.in > 0 || selected === month.key)
  if (visible.length === 0) {
    return <p className="notice">No money in or out in these months.</p>
  }

  return (
    <div className="month-breaks">
      {visible.map((month) => {
        const active = selected === month.key
        const rows = kind === 'categories' ? month.categories : month.accounts
        return (
          <article
            key={month.key}
            className={active ? 'month-break month-break--active' : 'month-break'}
            aria-current={active ? 'true' : undefined}
          >
            <header className="month-break__head">
              <h3 className="month-break__title">{formatMonth(month.key)}</h3>
              <p className="month-break__totals">
                Out {formatMoney(month.out)}
                <span aria-hidden="true"> · </span>
                In {formatMoney(month.in)}
              </p>
            </header>
            <div className="month-break__group">
              <p className="month-break__group-label">Money out</p>
              <DirectionLines rows={rows} direction="out" />
            </div>
            <div className="month-break__group month-break__group--in">
              <p className="month-break__group-label">Money in</p>
              <DirectionLines rows={rows} direction="in" />
            </div>
          </article>
        )
      })}
    </div>
  )
}
