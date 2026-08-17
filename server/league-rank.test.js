import assert from 'node:assert/strict'
import test from 'node:test'
import { gapToNext, LEAGUE_CODE_ALPHABET, makeLeagueCode, normalizeMetric, rankUsers } from './league-rank.js'

test('лиг код 6 тэмдэгт бөгөөд будилах тэмдэг агуулахгүй', () => {
  const code = makeLeagueCode(() => 0.5)
  assert.equal(code.length, 6)
  assert.ok([...code].every((char) => LEAGUE_CODE_ALPHABET.includes(char)))
  assert.doesNotMatch(code, /[01IO]/)
})

test('танихгүй metric pushup болно', () => {
  assert.equal(normalizeMetric('other'), 'pushup')
  assert.equal(normalizeMetric('battle'), 'battle')
})

test('ижил үндсэн оноо ижил байр эзэлнэ', () => {
  const rows = rankUsers([
    { _id: 'a', name: 'A', totalReps: 20, bestSet: 10 },
    { _id: 'b', name: 'B', totalReps: 20, bestSet: 8 },
    { _id: 'c', name: 'C', totalReps: 15, bestSet: 15 },
  ], 'pushup')
  assert.deepEqual(rows.map((row) => row.rank), [1, 1, 3])
})

test('battle рейтингээр, squat нийт суултаар эрэмбэлнэ', () => {
  const users = [
    { _id: 'a', name: 'A', rating: 990, wins: 8, squatTotalReps: 40 },
    { _id: 'b', name: 'B', rating: 1100, wins: 2, squatTotalReps: 20 },
  ]
  assert.equal(rankUsers(users, 'battle')[0].userId, 'b')
  assert.equal(rankUsers(users, 'squat')[0].userId, 'a')
})

test('дараагийн байрыг давахад хэрэгтэй зөрүүг олно', () => {
  const rows = rankUsers([
    { _id: 'a', name: 'A', totalReps: 30 },
    { _id: 'b', name: 'B', totalReps: 20 },
    { _id: 'c', name: 'C', totalReps: 15 },
  ], 'pushup')
  assert.equal(gapToNext(rows, 'c'), 6)
  assert.equal(gapToNext(rows, 'a'), null)
})
