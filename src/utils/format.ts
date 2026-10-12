const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatMoney(amount: number): string {
  return money.format(amount)
}

export function formatDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatMonth(key: string): string {
  const [year, month] = key.split('-').map(Number)
  if (!year || !month) return key
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

export function formatMonthShort(key: string): string {
  const [year, month] = key.split('-').map(Number)
  if (!year || !month) return key
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

export function formatSynced(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
