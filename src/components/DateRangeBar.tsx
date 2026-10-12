import { todayISO, type DateRange, type RangePreset } from '../../shared/range'

const CHIP_PRESETS: { id: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7', label: '7d' },
  { id: '14', label: '14d' },
  { id: '30', label: '30d' },
  { id: '90', label: '90d' },
  { id: 'all', label: 'All time' },
]

export default function DateRangeBar({
  range,
  preset,
  onPreset,
  onRange,
}: {
  range: DateRange
  preset: RangePreset
  onPreset: (preset: Exclude<RangePreset, 'custom'>) => void
  onRange: (range: DateRange) => void
}) {
  const today = todayISO()

  function changeStart(start: string) {
    if (!start || start > range.end) return
    onRange({ start, end: range.end })
  }

  function changeEnd(end: string) {
    if (!end || end < range.start || end > today) return
    onRange({ start: range.start, end })
  }

  return (
    <div className="range-bar">
      <div className="chip-row chip-row--wrap" role="group" aria-label="Date range">
        {CHIP_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={preset === item.id ? 'chip chip--active' : 'chip'}
            aria-pressed={preset === item.id}
            onClick={() => onPreset(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="range-dates">
        <input
          className="input range-date"
          type="date"
          value={range.start}
          max={range.end}
          aria-label="Start date"
          onChange={(event) => changeStart(event.target.value)}
        />
        <span className="range-dates__sep" aria-hidden="true">–</span>
        <input
          className="input range-date"
          type="date"
          value={range.end}
          min={range.start}
          max={today}
          aria-label="End date"
          onChange={(event) => changeEnd(event.target.value)}
        />
      </div>
    </div>
  )
}
