const ROW_CHUNK = 1000

/**
 * Sheets values.batchUpdate fails when a range runs past the current grid.
 * Grow to the next thousand rows, and widen columns only when the write needs them.
 * Never shrink a sheet.
 */
export function expandedGrid(
  current: { rowCount: number; columnCount: number },
  rows: number,
  columns: number,
): { rowCount: number; columnCount: number } | null {
  const rowCount = rows > current.rowCount ? Math.ceil(rows / ROW_CHUNK) * ROW_CHUNK : current.rowCount
  const columnCount = Math.max(current.columnCount, columns)
  if (rowCount === current.rowCount && columnCount === current.columnCount) return null
  return { rowCount, columnCount }
}
