import { describe, it, expect } from 'vitest'
import { todayIso, formatDisplayDate, addDays, isValidIsoDate, relativeDayLabel } from '@/utils/date'

describe('todayIso', () => {
  it('returns the local date as YYYY-MM-DD', () => {
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    expect(todayIso()).toBe(expected)
  })
})

describe('formatDisplayDate', () => {
  it('renders a human-readable date for a given ISO date', () => {
    expect(formatDisplayDate('2026-09-23')).toBe(
      new Date('2026-09-23T00:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    )
  })
})

describe('addDays', () => {
  it('moves one day forward and back', () => {
    expect(addDays('2026-09-23', 1)).toBe('2026-09-24')
    expect(addDays('2026-09-23', -1)).toBe('2026-09-22')
  })

  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('is not skewed by daylight-saving transitions', () => {
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-25', -1)).toBe('2026-10-24')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
  })
})

describe('isValidIsoDate', () => {
  it('accepts real calendar dates', () => {
    expect(isValidIsoDate('2026-09-23')).toBe(true)
    expect(isValidIsoDate('2028-02-29')).toBe(true)
  })

  it('rejects malformed or impossible dates', () => {
    expect(isValidIsoDate('foo')).toBe(false)
    expect(isValidIsoDate('2026-9-23')).toBe(false)
    expect(isValidIsoDate('2026-02-31')).toBe(false)
    expect(isValidIsoDate('2026-13-01')).toBe(false)
    expect(isValidIsoDate('2027-02-29')).toBe(false)
  })
})

describe('relativeDayLabel', () => {
  it('labels today, yesterday and tomorrow', () => {
    expect(relativeDayLabel('2026-09-23', '2026-09-23')).toBe('Today')
    expect(relativeDayLabel('2026-09-22', '2026-09-23')).toBe('Yesterday')
    expect(relativeDayLabel('2026-09-24', '2026-09-23')).toBe('Tomorrow')
  })

  it('returns null for other days', () => {
    expect(relativeDayLabel('2026-09-20', '2026-09-23')).toBeNull()
  })
})
