const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Local calendar date as `YYYY-MM-DD`, matching the backend's date-only API. */
function toIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayIso(): string {
  return toIso(new Date())
}

/** True for a real calendar date in `YYYY-MM-DD` form (rejects e.g. `2026-02-31`). */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  return toIso(new Date(year, month - 1, day)) === value
}

/** Shifts a `YYYY-MM-DD` date by whole calendar days, in local time so DST can't skew it. */
export function addDays(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number)
  return toIso(new Date(year, month - 1, day + days))
}

export function relativeDayLabel(dateIso: string, today: string): 'Today' | 'Yesterday' | 'Tomorrow' | null {
  if (dateIso === today) return 'Today'
  if (dateIso === addDays(today, -1)) return 'Yesterday'
  if (dateIso === addDays(today, 1)) return 'Tomorrow'
  return null
}

export function formatDisplayDate(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
