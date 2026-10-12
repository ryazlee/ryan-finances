import { accountColor, categoryColor } from '../utils/categoryColor'
import { AccountMark, CategoryMark } from '../utils/marks'
import { formatMoney } from '../utils/format'

export default function HorizontalBars({
  rows,
  kind,
  accountType,
  selectedKey,
  onSelect,
}: {
  rows: { key: string; label: string; amount: number }[]
  kind: 'category' | 'account'
  accountType?: (id: string) => string
  selectedKey?: string | null
  onSelect?: (key: string) => void
}) {
  if (rows.length === 0) {
    return <p className="notice">No money out in this period.</p>
  }

  const max = Math.max(...rows.map((row) => row.amount), 1)

  return (
    <div className="bars">
      {rows.map((row) => {
        const selected = selectedKey === row.key
        const dim = Boolean(selectedKey) && !selected
        const color = kind === 'account' ? accountColor(row.key) : categoryColor(row.label)
        const body = (
          <>
            <div className="bar__meta">
              <span className="bar__label">
                {kind === 'account' ? (
                  <AccountMark id={row.key} type={accountType?.(row.key)} />
                ) : (
                  <CategoryMark name={row.label} />
                )}
                {row.label}
              </span>
              <span className="bar__amount">{formatMoney(row.amount)}</span>
            </div>
            <div className="bar__track" aria-hidden="true">
              <div
                className="bar__fill"
                style={{
                  width: `${Math.max(3, (row.amount / max) * 100)}%`,
                  background: color,
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
