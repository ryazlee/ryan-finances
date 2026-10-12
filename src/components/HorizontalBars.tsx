import { categoryColor } from '../utils/categoryColor'
import { formatMoney } from '../utils/format'

export default function HorizontalBars({
  rows,
}: {
  rows: { key: string; label: string; amount: number }[]
}) {
  if (rows.length === 0) {
    return <p className="notice">No spend in this period.</p>
  }

  const max = Math.max(...rows.map((row) => row.amount), 1)

  return (
    <div className="bars">
      {rows.map((row) => (
        <div className="bar" key={row.key}>
          <div className="bar__meta">
            <span className="bar__label">{row.label}</span>
            <span className="bar__amount">{formatMoney(row.amount)}</span>
          </div>
          <div className="bar__track" aria-hidden="true">
            <div
              className="bar__fill"
              style={{
                width: `${Math.max(3, (row.amount / max) * 100)}%`,
                background: categoryColor(row.label),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
