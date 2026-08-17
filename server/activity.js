const DAY_MS = 86_400_000

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

export function dailyPushups(rows, { days = 7, timeZone = 'UTC', now = new Date() } = {}) {
  const count = Math.min(31, Math.max(1, Number.parseInt(days, 10) || 7))
  const zone = normalizeTimeZone(timeZone)
  const [year, month, day] = dateKey(now, zone).split('-').map(Number)
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
  return (Math.min(31, Math.max(1, Number.parseInt(days, 10) || 7)) + 2) * DAY_MS
}
