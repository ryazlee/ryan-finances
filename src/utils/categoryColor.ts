const NAMED: Record<string, string> = {
  food: '#5f8f72',
  coffee: '#a6844a',
  groceries: '#5f8f72',
  transport: '#5d7394',
  travel: '#6e8494',
  housing: '#8a735c',
  rent: '#8a735c',
  subscriptions: '#8d6b73',
  shopping: '#6f7f64',
  household: '#6f7f64',
  health: '#6d8578',
  entertainment: '#7a6e86',
  personal: '#8d6b73',
  services: '#5d7394',
  home: '#8a735c',
  fees: '#71717a',
  income: '#5f8f72',
  venmo: '#0057b8',
  investments: '#3f4c5a',
  payment: '#71717a',
  transfer: '#71717a',
  uncategorized: '#71717a',
  other: '#71717a',
}

const MUTED = ['#5f8f72', '#5d7394', '#a6844a', '#8d6b73', '#6f7f64', '#7a6e86', '#8a735c', '#6e8494']

const CARD_COLORS = ['#2563eb', '#0f766e', '#c2410c', '#7c3aed', '#be123c', '#0369a1', '#4d7c0f', '#a16207']

export function accountColor(id: string): string {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return CARD_COLORS[hash % CARD_COLORS.length] ?? CARD_COLORS[0]
}

export function categoryColor(name: string): string {
  const key = name.trim().toLowerCase()
  const named = NAMED[key]
  if (named) return named
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return MUTED[hash % MUTED.length] ?? MUTED[0]
}
