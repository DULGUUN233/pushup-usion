import assert from 'node:assert/strict'
import test from 'node:test'
import {
  battleIsLive,
  combinedWinner,
  COUNTDOWN_MS,
  normalizeBattleType,
  view,
  winnerFromReps,
} from './battle.js'

const players = ['a', 'b']

test('камер бэлэн болсны дараах эхлэх тоолол 10 секунд', () => {
  assert.equal(COUNTDOWN_MS, 10_000)
})

test('battle type зөвхөн зөвшөөрөгдсөн утгыг авна', () => {
  assert.equal(normalizeBattleType('squat'), 'squat')
  assert.equal(normalizeBattleType('combined'), 'combined')
  assert.equal(normalizeBattleType('unknown'), 'pushup')
})

test('нэг round-ийн ялагч rep-ээр шийдэгдэнэ', () => {
  assert.equal(winnerFromReps({ a: 12, b: 8 }, players), 'a')
  assert.equal(winnerFromReps({ a: 8, b: 12 }, players), 'b')
  assert.equal(winnerFromReps({ a: 10, b: 10 }, players), null)
})

test('combined-д хоёр дасгал ижил жинтэй', () => {
  assert.equal(combinedWinner({ pushup: 'a', squat: 'a' }, players), 'a')
  assert.equal(combinedWinner({ pushup: 'a', squat: 'b' }, players), null)
  assert.equal(combinedWinner({ pushup: 'a', squat: null }, players), 'a')
  assert.equal(combinedWinner({ pushup: null, squat: null }, players), null)
})

test('intermission reconnect-д үргэлжилж буй battle хэвээр', () => {
  assert.equal(battleIsLive({ status: 'intermission' }), true)
  assert.equal(battleIsLive({ status: 'playing', endsAt: new Date(Date.now() + 1000) }), true)
  assert.equal(battleIsLive({ status: 'playing', endsAt: new Date(Date.now() - 1000) }), false)
  assert.equal(battleIsLive({ status: 'finished' }), false)
})

test('view дасгал, round score, host сонголтыг хоёр талд ижил харуулна', () => {
  const state = view(
    {
      _id: 'room~1',
      players,
      hostId: 'a',
      status: 'intermission',
      battleType: 'combined',
      exercise: 'squat',
      currentRound: 2,
      reps: { a: 12, b: 8 },
      roundReps: { pushup: { a: 12, b: 8 }, squat: { a: 0, b: 0 } },
      roundWinners: { pushup: 'a' },
      ready: { a: true, b: true },
      armed: { a: true, b: true },
      profiles: {},
    },
    'a',
    players,
  )

  assert.equal(state.battleType, 'combined')
  assert.equal(state.exercise, 'squat')
  assert.equal(state.you.roundReps.pushup, 12)
  assert.equal(state.opponent.roundReps.pushup, 8)
  assert.equal(state.you.roundPoints, 1)
  assert.equal(state.youAreHost, true)
})
