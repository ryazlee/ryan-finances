const COLORS = [
  '#64748b',
  '#38bdf8',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#a78bfa',
  '#fb923c',
  '#22d3ee',
  '#a3e635',
  '#f472b6',
]

export function categoryColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return COLORS[hash % COLORS.length] ?? COLORS[0]
}
