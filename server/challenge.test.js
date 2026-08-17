import assert from 'node:assert/strict'
import test from 'node:test'
import { challengeSummary, createChallenge } from './challenge.js'

const start = new Date('2026-08-17T00:00:00.000Z')

test('default weekly challenge зөв baseline, хугацаатай үүснэ', () => {
  const challenge = createChallenge({ templateId: 'weekly-pushup' }, start)
  assert.equal(challenge.exercise, 'pushup')
  assert.equal(challenge.dailyTarget, 20)
  assert.equal(challenge.target, 140)
  assert.equal(challenge.endsAt.toISOString(), '2026-08-24T00:00:00.000Z')
})

test('хосолсон challenge нэг өдрийн push-up ба squat-ийг нийлүүлнэ', () => {
  const challenge = createChallenge({ exercise: 'combined', dailyTarget: 50, days: 10 }, start)
  const rows = [
    { exercise: 'pushup', reps: 30, finishedAt: new Date('2026-08-17T05:00:00.000Z') },
    { exercise: 'squat', reps: 25, finishedAt: new Date('2026-08-17T06:00:00.000Z') },
  ]
  const summary = challengeSummary(challenge, rows, new Date('2026-08-18T00:00:00.000Z'))
  assert.equal(summary.progress, 50)
  assert.equal(summary.completedDays, 1)
  assert.equal(summary.status, 'active')
})

test('зорилгодоо хүрсэн challenge completed болно', () => {
  const challenge = createChallenge({ exercise: 'squat', dailyTarget: 20, days: 1 }, start)
  const rows = [{ exercise: 'squat', reps: 20, finishedAt: new Date('2026-08-17T01:00:00.000Z') }]
  assert.equal(challengeSummary(challenge, rows, start).status, 'completed')
})

test('нэг өдрийн зорилго тасарвал challenge шууд failed болно', () => {
  const challenge = createChallenge({ exercise: 'pushup', dailyTarget: 50, days: 7 }, start)
  const rows = [{ exercise: 'pushup', reps: 49, finishedAt: new Date('2026-08-17T10:00:00.000Z') }]
  assert.equal(challengeSummary(challenge, rows, new Date('2026-08-18T00:00:00.000Z')).status, 'failed')
})

test('custom challenge-ийн утгуудыг хязгаарлана', () => {
  assert.throws(() => createChallenge({ exercise: 'run', dailyTarget: 50, days: 7 }, start))
  assert.throws(() => createChallenge({ exercise: 'pushup', dailyTarget: 0, days: 7 }, start))
  assert.throws(() => createChallenge({ exercise: 'pushup', dailyTarget: 50, days: 366 }, start))
})
