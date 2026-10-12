import { categoryColor } from '../utils/categoryColor'
import { formatMoney } from '../utils/format'

export default function HorizontalBars({
  rows,
  selectedKey,
  onSelect,
}: {
  rows: { key: string; label: string; amount: number }[]
  selectedKey?: string | null
  onSelect?: (key: string) => void
}) {
  if (rows.length === 0) {
    return <p className="notice">No spend in this period.</p>
  }

  const max = Math.max(...rows.map((row) => row.amount), 1)

  return (
    <div className="bars">
      {rows.map((row) => {
        const selected = selectedKey === row.key
        const dim = Boolean(selectedKey) && !selected
        const body = (
          <>
            <div className="bar__meta">
              <span className="bar__label">
                <span className="swatch" style={{ background: categoryColor(row.key) }} />
                {row.label}
              </span>
              <span className="bar__amount">{formatMoney(row.amount)}</span>
            </div>
            <div className="bar__track" aria-hidden="true">
              <div
                className="bar__fill"
                style={{
                  width: `${Math.max(3, (row.amount / max) * 100)}%`,
                  background: categoryColor(row.key),
                  opacity: dim ? 0.35 : 1,
                }}
              />
            </div>
          </>
        )
        if (!onSelect) {
          return (
            <div className="bar" key={row.key}>
              {body}
            </div>
          )
        }
        return (
          <button
            key={row.key}
            type="button"
            className={selected ? 'bar bar--button bar--selected' : 'bar bar--button'}
            aria-pressed={selected}
            onClick={() => onSelect(row.key)}
          >
            {body}
          </button>
        )
      })}
    </div>
  )
}
