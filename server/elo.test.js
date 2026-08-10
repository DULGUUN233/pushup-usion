import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  RATING_FLOOR,
  START_RATING,
  expectedScore,
  kFactor,
  nextRating,
  settleBattle,
} from './elo.js'

test('тэнцүү рейтингтэй бол хожих магадлал тал', () => {
  assert.equal(expectedScore(1000, 1000), 0.5)
})

test('K эхний 20 тулаанд том, дараа нь бага', () => {
  assert.equal(kFactor(0), 40)
  assert.equal(kFactor(19), 40)
  assert.equal(kFactor(20), 20)
})

test('тэнцүү өрсөлдөгчийг хожвол K/2 нэмэгдэнэ', () => {
  assert.equal(nextRating({ rating: 1000, opponentRating: 1000, score: 1, battles: 0 }), 1020)
  assert.equal(nextRating({ rating: 1000, opponentRating: 1000, score: 0, battles: 0 }), 980)
})

test('хүчтэй өрсөлдөгчийг хожвол илүү их авна', () => {
  const weak = nextRating({ rating: 1000, opponentRating: 1400, score: 1, battles: 50 })
  const even = nextRating({ rating: 1000, opponentRating: 1000, score: 1, battles: 50 })
  assert.ok(weak - 1000 > even - 1000)
})

test('рейтинг шалнаас доош унахгүй', () => {
  assert.equal(
    nextRating({ rating: RATING_FLOOR, opponentRating: 3000, score: 0, battles: 0 }),
    RATING_FLOOR,
  )
})

test('settleBattle нийлбэрийг хадгална', () => {
  const a = { userId: 'a', rating: 1200, battles: 5 }
  const b = { userId: 'b', rating: 900, battles: 5 }
  const r = settleBattle({ a, b, winnerId: 'a' })
  assert.equal(r.a.after - r.a.before, -(r.b.after - r.b.before))
  assert.ok(r.a.after > r.a.before)
  assert.ok(r.b.after < r.b.before)
})

test('тэнцсэн үед сул тал нэмэгдэнэ', () => {
  const r = settleBattle({
    a: { userId: 'a', rating: 1400, battles: 30 },
    b: { userId: 'b', rating: 1000, battles: 30 },
    winnerId: null,
  })
  assert.ok(r.a.after < 1400)
  assert.ok(r.b.after > 1000)
})

test('танихгүй winnerId алдаа өгнө', () => {
  assert.throws(() =>
    settleBattle({
      a: { userId: 'a', rating: START_RATING, battles: 0 },
      b: { userId: 'b', rating: START_RATING, battles: 0 },
      winnerId: 'c',
    }),
  )
})
