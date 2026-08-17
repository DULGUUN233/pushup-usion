import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('squat battle камер зүүн/баруун бүтэн өндөртэй байрлана', () => {
  assert.match(
    html,
    /#play\.duel\.squat-duel #oppVid\{[^}]*left:0[^}]*width:50%;height:calc\(100% - var\(--squat-head\)\)/s,
  )
  assert.match(
    html,
    /#play\.duel\.squat-duel #video,[\s\S]*?#play\.duel\.squat-duel #canvas\{[^}]*left:50%[^}]*width:50%;height:calc\(100% - var\(--squat-head\)\)/,
  )
})

test('дасгал солигдоход squat layout class мөн солигдоно', () => {
  assert.match(
    html,
    /function syncBattleExercise\(state\)\{[\s\S]*?classList\.toggle\("squat-duel", next === "squat"\);[\s\S]*?if\(exercise === next\) return;/,
  )
})

test('камер эргэхэд canvas хоёр хэмжээсээ шинэчилнэ', () => {
  assert.match(
    html,
    /canvas\.width !== video\.videoWidth \|\| canvas\.height !== video\.videoHeight/,
  )
})

test('battle feedback scoreboard-оос хол, өөрийн камерын доод хэсэгт байна', () => {
  assert.match(html, /#hud\{[^}]*justify-content:flex-end/s)
  assert.match(
    html,
    /#play\.duel\.squat-duel #bottom\{[^}]*align-self:flex-end[^}]*width:calc\(50% - 4px\)/s,
  )
})
