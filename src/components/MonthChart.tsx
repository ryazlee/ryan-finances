import type { AmountRow } from '../../shared/aggregate'
import { formatMoney, formatMonthShort } from '../utils/format'

export default function MonthChart({
  rows,
  selected,
}: {
  rows: AmountRow[]
  selected: string | null
}) {
  const max = Math.max(...rows.map((row) => row.amount), 1)

  return (
    <div className="month-chart" role="img" aria-label="Spend by month">
      {rows.map((row) => {
        const dim = selected !== null && selected !== row.key
        const height = row.amount <= 0 ? 0 : Math.max(4, (row.amount / max) * 100)
        return (
          <div className="month-chart__col" key={row.key}>
            <div className="month-chart__track">
              <div
                className={dim ? 'month-chart__fill month-chart__fill--dim' : 'month-chart__fill'}
                style={{ height: `${height}%` }}
                title={`${formatMonthShort(row.key)} ${formatMoney(row.amount)}`}
              />
            </div>
            <div className="month-chart__label">{formatMonthShort(row.key)}</div>
          </div>
        )
      })}
    </div>
  )
}
