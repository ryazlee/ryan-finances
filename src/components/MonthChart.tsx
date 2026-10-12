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
  const peak = Math.max(...rows.map((row) => row.amount), 1)
  const legend = new Map<string, string>()
  for (const row of rows) {
    for (const part of row.parts) legend.set(part.key, part.label)
  }

  const newestFirst = [...rows].reverse()

  return (
    <div>
      <div className="month-list" role="group" aria-label="Money out by month">
        {newestFirst.filter((row) => row.amount > 0 || selected === row.key).map((row) => {
          const active = selected === row.key
          const dim = selected !== null && !active
          const width = row.amount <= 0 ? 0 : Math.max(6, (row.amount / peak) * 100)
          return (
            <button
              key={row.key}
              type="button"
              className={[
                'month-list__row',
                active ? 'month-list__row--active' : '',
                dim ? 'month-list__row--dim' : '',
              ].filter(Boolean).join(' ')}
              aria-pressed={active}
              onClick={() => onSelect(row.key)}
            >
              <span className="month-list__name">{formatMonthShort(row.key)}</span>
              <span className="month-list__track">
                <span className="month-list__fill" style={{ width: `${width}%` }}>
                  {row.parts.map((part) => (
                    <span
                      key={part.key}
                      className="month-list__seg"
                      style={{ flexGrow: part.amount, background: categoryColor(part.key) }}
                    />
                  ))}
                </span>
              </span>
              <span className="month-list__amount">{row.amount > 0 ? formatMoney(row.amount) : '$0'}</span>
            </button>
          )
        })}
      </div>
      <div className="month-chart" role="group" aria-label="Money out by month">
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
