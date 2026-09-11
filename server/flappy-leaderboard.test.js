import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { parseFlappyScore, rankUsers } from './league-rank.js'

const routes = await readFile(new URL('./routes.js', import.meta.url), 'utf8')
const db = await readFile(new URL('./db.js', import.meta.url), 'utf8')
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('Push Up and Squat Flappy share one highest-score leaderboard entry', async () => {
  const user = { _id:'player', name:'Player', flappyBest:0 }
  let handler
  runInNewContext(routes.match(/router\.post\('\/flappy-score'[^]*?\n\}\)/)[0], {
    router:{post:(_path, _auth, callback) => { handler = callback }},
    requireUser(){}, parseFlappyScore, findOrCreateUser:async () => user,
    users:() => ({findOneAndUpdate:async (filter, update) => {
      assert.equal(filter._id, user._id)
      user.flappyBest = Math.max(user.flappyBest, update.$max.flappyBest)
      return user
    }}),
  })
  const storage = new Map()
  const pending = []
  const state = {
    exercise:'pushup', profile:{flappyBest:0}, leagueHubData:null,
    FLAPPY_PENDING_KEY:'pending', count:0, navigator:{},
    cancelAnimationFrame(){}, clearTimeout(){},
    $:() => ({classList:{remove(){}}}),
    localStorage:{getItem:key => storage.get(key), setItem:(key,value) => storage.set(key,value), removeItem:key => storage.delete(key)},
    api:(_path, options) => {
      assert.equal(_path, '/flappy-score')
      const request = new Promise(resolve => {
        handler({user:{userId:user._id},body:JSON.parse(options.body)}, {json:resolve})
      })
      pending.push(request)
      return request
    },
  }
  const functions = ['readPendingFlappyScore','saveFlappyScore','finishPushGame']
    .map(name => html.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0]).join('\n')
  for(const [exercise, score, expected] of [['pushup',20,20],['squat',35,35],['pushup',10,35],['squat',35,35]]){
    state.exercise = exercise
    state.pushGameState = {active:true,over:false,score}
    runInNewContext(`${functions}; finishPushGame('Game over', false)`, state)
    await Promise.all(pending)
    await new Promise(resolve => setImmediate(resolve))
    const rows = rankUsers([user], 'flappy')
    assert.equal(rows.length, 1)
    assert.equal(rows[0].score, expected)
    assert.equal(state.profile.flappyBest, expected)
  }
})

test('Flappy endpoint өмнөх рекордыг багасгалгүй зөвхөн их оноогоор шинэчилнэ', () => {
  assert.match(routes, /router\.post\('\/flappy-score', requireUser/)
  assert.match(routes, /\$max: \{ flappyBest: score \}/)
  assert.match(routes, /bestScore: user\.flappyBest \?\? 0/)
})

test('шинэ хэрэглэгч Flappy рекорд 0-оос эхэлж leaderboard индекс ашиглана', () => {
  assert.match(db, /createIndex\(\{ flappyBest: -1 \}\)/)
  assert.ok((db.match(/flappyBest: 0/g) ?? []).length >= 2)
})
