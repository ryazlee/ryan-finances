import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  dayCount,
  includesDate,
  monthRange,
  monthsInRange,
  presetForRange,
  previousRange,
  rangeForPreset,
} from './range.ts'

const end = '2026-10-12'

describe('range', () => {
  it('builds inclusive day presets ending on the given day', () => {
    const week = rangeForPreset('7', end)
    assert.deepEqual(week, { start: '2026-10-06', end })
    assert.equal(dayCount(week), 7)
    assert.equal(presetForRange(week, end), '7')
    assert.equal(rangeForPreset('today', end).start, end)
    assert.equal(rangeForPreset('all', end).start, '2000-01-01')
  })

  it('treats a hand-picked span as custom and walks back one window', () => {
    const range = { start: '2026-10-01', end: '2026-10-12' }
    assert.equal(presetForRange(range, end), 'custom')
    assert.deepEqual(previousRange(rangeForPreset('7', end)), { start: '2026-09-29', end: '2026-10-05' })
    assert.equal(previousRange(rangeForPreset('all', end)), null)
  })

  it('clamps a month to today and lists the months a range touches', () => {
    assert.deepEqual(monthRange('2026-10', end), { start: '2026-10-01', end })
    assert.deepEqual(monthRange('2026-09', end), { start: '2026-09-01', end: '2026-09-30' })
    assert.deepEqual(monthsInRange({ start: '2026-09-28', end: '2026-10-02' }), ['2026-09', '2026-10'])
    assert.equal(monthsInRange(rangeForPreset('all', end)), 'open')
    assert.equal(includesDate({ start: '2026-10-01', end }, '2026-10-12'), true)
    assert.equal(includesDate({ start: '2026-10-01', end }, '2026-09-30'), false)
  })
})
