export function monthKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function recentMonths(count: number, from = new Date()): string[] {
  const months: string[] = []
  for (let i = count - 1; i >= 0; i -= 1) {
    months.push(monthKey(new Date(from.getFullYear(), from.getMonth() - i, 1)))
  }
  return months
}

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number)
  return monthKey(new Date(year ?? 1970, (month ?? 1) - 1 + delta, 1))
}

export function daysAgo(days: number, from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() - days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
