import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

function sourceOf(name) {
  const match = html.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`))
  assert.ok(match, `${name} source олдсонгүй`)
  return match[0]
}

test('2D бугуйн шугам өвдөг хүрсэн ба өргөгдсөн байрлалыг ялгана', () => {
  const detectorSource = sourceOf('pushupGroundMetric')
  const metric = new Function(`
    const GROUND_VIS_MIN = 0.5;
    ${detectorSource}
    return pushupGroundMetric;
  `)()
  assert.doesNotMatch(detectorSource, /\bworld\b|\b31\b|\b32\b/,
    'detector 3D depth болон өлмийг дахин ашиглахгүй')
  const lm = Array.from({ length:33 }, () => ({ x:.5, y:.5, visibility:1 }))
  Object.assign(lm[15], { x:.12, y:.84 })
  Object.assign(lm[16], { x:.88, y:.85 })
  Object.assign(lm[11], { x:.35, y:.42 })
  Object.assign(lm[12], { x:.65, y:.42 })
  Object.assign(lm[23], { x:.43, y:.58 })
  Object.assign(lm[24], { x:.57, y:.58 })
  Object.assign(lm[25], { x:.43, y:.82 })
  Object.assign(lm[26], { x:.57, y:.82 })

  assert.ok(metric(lm, 1).ratio < .24, 'өвдөг бугуйн шалны шугамд ойр бол хүрсэн')
  lm[25].y = lm[26].y = .73
  assert.ok(metric(lm, 1).ratio > .6, 'өвдөг илт өргөгдсөн бол хүрээгүй')
  lm[31].visibility = lm[32].visibility = .05
  assert.ok(metric(lm, 1).ratio > .6, 'өлмий харагдахгүй байсан ч хэмжинэ')
  lm[15].visibility = .1
  assert.equal(metric(lm, 1), null, 'бугуйн лавлагаа найдваргүй бол таахгүй')
})

test('өвдөг газарт 4 frame тогтвортой байж зөрчил батлагдаад hysteresis-ээр гарна', () => {
  const advance = new Function(`
    const GROUND_CONTACT_RATIO=.24, GROUND_RELEASE_RATIO=.36;
    const GROUND_CONFIRM_FRAMES=4, GROUND_RELEASE_FRAMES=3;
    ${sourceOf('advancePushupGround')}
    return advancePushupGround;
  `)()
  let state = { contact:false, contactFrames:0, clearFrames:0 }
  for(let i=0;i<3;i++) state = advance(state, .12)
  assert.equal(state.contact, false)
  state = advance(state, .12)
  assert.equal(state.contact, true)
  state = advance(state, null)
  state = advance(state, Number.NaN)
  state = advance(state, undefined)
  assert.equal(state.contact, true, 'танилт тасрах нь өвдгөө өргөсөнд тооцогдохгүй')
  state = advance(state, .3)
  assert.equal(state.contact, true, 'hysteresis мужид төлөв савлахгүй')
  state = advance(state, .65)
  state = advance(state, .65)
  assert.equal(state.contact, true)
  state = advance(state, .65)
  assert.equal(state.contact, false)
})

test('газар шалгалт solo, Flappy, Battle push-up горимд ажиллана', () => {
  const enabled = new Function('mode', 'soloVariant', 'exercise', `
    ${sourceOf('pushupGroundEnabled')}
    return pushupGroundEnabled();
  `)
  assert.equal(enabled('solo', 'normal', 'pushup'), true)
  assert.equal(enabled('solo', 'game', 'pushup'), true)
  assert.equal(enabled('battle', 'normal', 'pushup'), true)
  assert.equal(enabled('solo', 'normal', 'squat'), false)
  assert.match(html, /if\(pushupGroundEnabled\(\)\)\{[\s\S]*?updatePushupGround/)
  assert.match(html, /pushupGroundEnabled\(\) && pushupGroundViolation/)
  assert.match(html, /if\(bad === GROUND_CONTACT_MESSAGE\)\{[\s\S]*?idle\(\);[\s\S]*?badFrames = 0;/,
    'дундуур өвдөг хүрвэл rep cycle шууд цуцлагдана')
  assert.match(html, /const flappyStarted = mode === "solo" && soloVariant === "game"[\s\S]*?if\(flappyStarted\) finishPushGame\("Өвдөг шаланд хүрлээ"\);/,
    'Flappy эхэлсний дараа өвдөг хүрвэл шууд game over болно')
})
