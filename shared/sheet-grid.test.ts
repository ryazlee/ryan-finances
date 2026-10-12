import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { expandedGrid } from './sheet-grid.ts'

describe('expandedGrid', () => {
  it('grows a full sheet past the last row to the next thousand', () => {
    assert.deepEqual(expandedGrid({ rowCount: 1632, columnCount: 26 }, 1633, 1), {
      rowCount: 2000,
      columnCount: 26,
    })
  })

  it('rounds a large append up to a whole thousand', () => {
    assert.deepEqual(expandedGrid({ rowCount: 1632, columnCount: 26 }, 11632, 1), {
      rowCount: 12000,
      columnCount: 26,
    })
  })

  it('leaves a sheet that already fits', () => {
    assert.equal(expandedGrid({ rowCount: 2000, columnCount: 26 }, 1633, 1), null)
  })

  it('covers a write that starts inside the grid and runs past it', () => {
    assert.deepEqual(expandedGrid({ rowCount: 1000, columnCount: 26 }, 2500, 14), {
      rowCount: 3000,
      columnCount: 26,
    })
  })

  it('widens a sheet that is short on columns', () => {
    assert.deepEqual(expandedGrid({ rowCount: 1000, columnCount: 10 }, 10, 14), {
      rowCount: 1000,
      columnCount: 14,
    })
  })
})
