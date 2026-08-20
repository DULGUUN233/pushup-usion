const DAY_MS = 86_400_000
export const MAX_ACTIVITY_DAYS = 220

export function normalizeActivityDays(value) {
  return Math.min(MAX_ACTIVITY_DAYS, Math.max(1, Number.parseInt(value, 10) || 7))
}

export function normalizeTimeZone(value) {
  const candidate = typeof value === 'string' && value.length <= 64 ? value : 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format()
    return candidate
  } catch {
    return 'UTC'
  }
}

export function normalizeActivityExercise(value) {
  return value === 'squat' ? 'squat' : 'pushup'
}

function dateKey(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function normalizeActivityEndDate(value, { timeZone = 'UTC', now = new Date() } = {}) {
  const zone = normalizeTimeZone(timeZone)
  const today = dateKey(now, zone)
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return today
  const parsed = new Date(`${value}T12:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return today
  return value > today ? today : value
}

export function activityQueryWindow(endDate, days) {
  const count = normalizeActivityDays(days)
  const endNoon = new Date(`${endDate}T12:00:00Z`).getTime()
  return {
    start: new Date(endNoon - (count + 2) * DAY_MS),
    end: new Date(endNoon + 2 * DAY_MS),
  }
}

export function dailyPushups(rows, { days = 7, timeZone = 'UTC', now = new Date(), endDate } = {}) {
  const count = normalizeActivityDays(days)
  const zone = normalizeTimeZone(timeZone)
  const [year, month, day] = normalizeActivityEndDate(endDate, { timeZone: zone, now }).split('-').map(Number)
  const keys = Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(year, month - 1, day - (count - 1 - index))).toISOString().slice(0, 10),
  )
  const totals = new Map(keys.map((key) => [key, 0]))

  for (const row of rows) {
    const key = dateKey(row.finishedAt, zone)
    if (totals.has(key)) totals.set(key, totals.get(key) + Math.max(0, Number(row.reps) || 0))
  }

  return keys.map((date) => ({ date, reps: totals.get(date) }))
}

export function activityLookback(days) {
  return (normalizeActivityDays(days) + 2) * DAY_MS
}
