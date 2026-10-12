import type { MonthStack } from '../../shared/aggregate'
import { categoryColor } from '../utils/categoryColor'
import { formatMoney, formatMonthShort } from '../utils/format'

function compactMoney(amount: number): string {
  if (amount >= 1000) {
    const thousands = amount / 1000
    const rounded = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10
    return `$${rounded}k`
  }
  return `$${Math.round(amount)}`
}

export default function MonthChart({
  rows,
  selected,
  onSelect,
}: {
  rows: MonthStack[]
  selected: string | null
  onSelect: (month: string) => void
}) {
  const max = Math.max(...rows.map((row) => Math.sqrt(row.amount)), 1)
  const legend = new Map<string, string>()
  for (const row of rows) {
    for (const part of row.parts) legend.set(part.key, part.label)
  }

  return (
    <div>
      <div className="month-chart" role="group" aria-label="Spend by month">
        {rows.map((row) => {
          const active = selected === row.key
          const dim = selected !== null && !active
          const height = row.amount <= 0 ? 0 : Math.max(12, (Math.sqrt(row.amount) / max) * 100)
          return (
            <button
              key={row.key}
              type="button"
              className={active ? 'month-chart__col month-chart__col--active' : 'month-chart__col'}
              aria-pressed={active}
              title={`${formatMonthShort(row.key)} ${formatMoney(row.amount)}`}
              onClick={() => onSelect(row.key)}
            >
              <div className="month-chart__track">
                <div
                  className={dim ? 'month-chart__fill month-chart__fill--dim' : 'month-chart__fill'}
                  style={{ height: `${height}%` }}
                >
                  {row.parts.map((part) => (
                    <div
                      key={part.key}
                      className="month-chart__seg"
                      style={{ flexGrow: part.amount, background: categoryColor(part.key) }}
                      title={`${part.label} ${formatMoney(part.amount)}`}
                    />
                  ))}
                </div>
              </div>
              <div className="month-chart__label">
                {formatMonthShort(row.key)}
                {row.amount > 0 ? <span className="month-chart__amount">{compactMoney(row.amount)}</span> : null}
              </div>
            </button>
          )
        })}
      </div>
      {legend.size > 0 ? (
        <div className="legend">
          {[...legend.entries()].map(([key, label]) => (
            <span className="legend__item" key={key}>
              <span className="swatch" style={{ background: categoryColor(key) }} />
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
