import assert from 'node:assert/strict'
import test from 'node:test'
import { activityLookback, dailyPushups, normalizeActivityExercise, normalizeTimeZone } from './activity.js'

test('сүүлийн 7 өдрийн push-up-ийг өдөр бүрээр нэгтгэнэ', () => {
  const days = dailyPushups(
    [
      { reps: 12, finishedAt: new Date('2026-08-16T12:00:00Z') },
      { reps: 8, finishedAt: new Date('2026-08-16T13:00:00Z') },
      { reps: 5, finishedAt: new Date('2026-08-17T01:00:00Z') },
    ],
    { days: 7, timeZone: 'UTC', now: new Date('2026-08-17T08:00:00Z') },
  )

  assert.deepEqual(days.slice(-2), [
    { date: '2026-08-16', reps: 20 },
    { date: '2026-08-17', reps: 5 },
  ])
})

test('хэрэглэгчийн timezone-аар өдрийн заагийг тооцно', () => {
  const days = dailyPushups(
    [{ reps: 9, finishedAt: new Date('2026-08-16T17:00:00Z') }],
    { days: 2, timeZone: 'Asia/Ulaanbaatar', now: new Date('2026-08-17T02:00:00Z') },
  )

  assert.deepEqual(days, [
    { date: '2026-08-16', reps: 0 },
    { date: '2026-08-17', reps: 9 },
  ])
})

test('буруу timezone UTC fallback болж, lookback хамгаалагдана', () => {
  assert.equal(normalizeTimeZone('not/a-zone'), 'UTC')
  assert.equal(activityLookback(7), 9 * 86_400_000)
  assert.equal(activityLookback(100), 33 * 86_400_000)
})

test('activity дасгал зөвхөн pushup эсвэл squat байна', () => {
  assert.equal(normalizeActivityExercise('squat'), 'squat')
  assert.equal(normalizeActivityExercise('pushup'), 'pushup')
  assert.equal(normalizeActivityExercise('burpee'), 'pushup')
})
