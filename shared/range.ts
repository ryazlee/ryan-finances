import { shiftMonth } from './months.ts'

export type DateRange = {
  start: string
  end: string
}

/** Start used by All time. A range that begins here has no prior window. */
export const ALL_TIME_START = '2000-01-01'

export type RangePreset = 'today' | '7' | '14' | '30' | '90' | 'mtd' | 'ytd' | 'all' | 'custom'

const CHIP_PRESETS: Exclude<RangePreset, 'custom'>[] = ['today', '7', '14', '30', '90', 'mtd', 'ytd', 'all']

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function todayISO(from = new Date()): string {
  return toISODate(from)
}

export function rangeForPreset(preset: Exclude<RangePreset, 'custom'>, end = todayISO()): DateRange {
  if (preset === 'today') return { start: end, end }
  if (preset === 'all') return { start: ALL_TIME_START, end }
  if (preset === 'mtd') return { start: `${end.slice(0, 7)}-01`, end }
  if (preset === 'ytd') return { start: `${end.slice(0, 4)}-01-01`, end }
  const endDate = new Date(`${end}T12:00:00`)
  const startDate = new Date(endDate)
  startDate.setDate(endDate.getDate() - (Number(preset) - 1))
  return { start: toISODate(startDate), end }
}

export function presetForRange(range: DateRange, end = todayISO()): RangePreset {
  for (const preset of CHIP_PRESETS) {
    const expected = rangeForPreset(preset, end)
    if (expected.start === range.start && expected.end === range.end) return preset
  }
  return 'custom'
}

export function formatRangeLabel(range: DateRange): string {
  const fmt = (iso: string) => {
    const date = new Date(`${iso}T12:00:00`)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (range.start === range.end) return fmt(range.start)
  return `${fmt(range.start)} – ${fmt(range.end)}`
}

export function formatPeriod(preset: RangePreset, range: DateRange): string {
  if (preset === 'today') return 'Today'
  if (preset === 'all') return 'All time'
  if (preset === 'mtd') return 'Month to date'
  if (preset === 'ytd') return 'Year to date'
  if (preset === '7' || preset === '14' || preset === '30' || preset === '90') return `Last ${preset} days`
  return formatRangeLabel(range)
}

export function dayCount(range: DateRange): number {
  const start = new Date(`${range.start}T12:00:00`)
  const end = new Date(`${range.end}T12:00:00`)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
}

export function includesDate(range: DateRange, date: string): boolean {
  return date >= range.start && date <= range.end
}

export function previousRange(range: DateRange): DateRange | null {
  if (range.start <= ALL_TIME_START) return null
  const days = dayCount(range)
  if (!Number.isFinite(days) || days < 1) return null
  const endDate = new Date(`${range.start}T12:00:00`)
  endDate.setDate(endDate.getDate() - 1)
  const startDate = new Date(endDate)
  startDate.setDate(endDate.getDate() - (days - 1))
  return { start: toISODate(startDate), end: toISODate(endDate) }
}

export function monthRange(month: string, today = todayISO()): DateRange {
  const [year, monthNumber] = month.split('-').map(Number)
  const last = new Date(year ?? 1970, monthNumber ?? 1, 0).getDate()
  const end = `${month}-${String(last).padStart(2, '0')}`
  return { start: `${month}-01`, end: end > today ? today : end }
}

/** Months touched by a bounded range. All time returns open so the caller uses the data. */
export function monthsInRange(range: DateRange): string[] | 'open' {
  if (range.start <= ALL_TIME_START) return 'open'
  const months: string[] = []
  let cursor = range.start.slice(0, 7)
  const end = range.end.slice(0, 7)
  while (cursor <= end && months.length < 48) {
    months.push(cursor)
    cursor = shiftMonth(cursor, 1)
  }
  return months
}
