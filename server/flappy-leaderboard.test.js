import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const routes = await readFile(new URL('./routes.js', import.meta.url), 'utf8')
const db = await readFile(new URL('./db.js', import.meta.url), 'utf8')

test('Flappy endpoint өмнөх рекордыг багасгалгүй зөвхөн их оноогоор шинэчилнэ', () => {
  assert.match(routes, /router\.post\('\/flappy-score', requireUser/)
  assert.match(routes, /\$max: \{ flappyBest: score \}/)
  assert.match(routes, /bestScore: user\.flappyBest \?\? 0/)
})

test('шинэ хэрэглэгч Flappy рекорд 0-оос эхэлж leaderboard индекс ашиглана', () => {
  assert.match(db, /createIndex\(\{ flappyBest: -1 \}\)/)
  assert.ok((db.match(/flappyBest: 0/g) ?? []).length >= 2)
})
