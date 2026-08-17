const DAY_MS = 24 * 60 * 60 * 1000

export const CHALLENGE_TEMPLATES = Object.freeze([
  Object.freeze({ id: 'weekly-pushup', title: '7 хоногийн Push Up', exercise: 'pushup', dailyTarget: 20, days: 7 }),
  Object.freeze({ id: 'monthly-combined', title: '30 хоногийн Хосолсон', exercise: 'combined', dailyTarget: 20, days: 30 }),
])

const EXERCISES = new Set(['pushup', 'squat', 'combined'])

export function createChallenge(input, now = new Date()) {
  const template = CHALLENGE_TEMPLATES.find((item) => item.id === input?.templateId)
  const exercise = template?.exercise ?? input?.exercise
  const dailyTarget = Number(template?.dailyTarget ?? input?.dailyTarget)
  const days = Number(template?.days ?? input?.days)

  if (!EXERCISES.has(exercise)) throw new Error('Дасгалын төрлөө сонгоно уу.')
  if (!Number.isInteger(dailyTarget) || dailyTarget < 1 || dailyTarget > 1000) {
    throw new Error('Өдрийн зорилго 1–1000 хооронд бүхэл тоо байна.')
  }
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error('Хугацаа 1–365 хоног байна.')
  }

  return {
    id: template?.id ?? `custom-${now.getTime()}`,
    title: template?.title ?? 'Миний challenge',
    exercise,
    dailyTarget,
    target: dailyTarget * days,
    days,
    custom: !template,
    startedAt: now,
    endsAt: new Date(now.getTime() + days * DAY_MS),
  }
}

export function challengeSummary(challenge, rows = [], now = new Date()) {
  if (!challenge) return null
  const startedAt = new Date(challenge.startedAt)
  const endsAt = new Date(challenge.endsAt)
  const dailyTarget = Math.max(1, Number(challenge.dailyTarget) || 1)
  const daily = Array.from({ length: challenge.days }, () => 0)
  for (const row of rows) {
    if (challenge.exercise !== 'combined' && row.exercise !== challenge.exercise) continue
    const index = Math.floor((new Date(row.finishedAt).getTime() - startedAt.getTime()) / DAY_MS)
    if (index >= 0 && index < daily.length) daily[index] += Math.max(0, Number(row.reps) || 0)
  }
  const completedDays = daily.filter((reps) => reps >= dailyTarget).length
  const elapsedDays = Math.min(challenge.days, Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / DAY_MS)))
  const missedDay = daily.slice(0, elapsedDays).some((reps) => reps < dailyTarget)
  const status = completedDays >= challenge.days ? 'completed' : missedDay || now >= endsAt ? 'failed' : 'active'
  const progress = daily.reduce((sum, reps) => sum + Math.min(reps, dailyTarget), 0)
  const target = dailyTarget * challenge.days

  return {
    ...challenge,
    target,
    progress,
    percent: Math.min(100, Math.round(progress / target * 100)),
    status,
    daily,
    completedDays,
    currentDay: Math.min(challenge.days, elapsedDays + 1),
    remainingDays: status === 'active' ? challenge.days - elapsedDays : 0,
  }
}
