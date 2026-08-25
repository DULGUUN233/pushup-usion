import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

function sourceOf(name) {
  const match = html.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`))
  assert.ok(match, `${name} source олдсонгүй`)
  return match[0]
}

test('3D тулгуур хавтгай өвдөгний шалнаас зайг биеийн хэмжээгээр бодно', () => {
  const metric = new Function(`
    const GROUND_VIS_MIN = 0.5;
    ${sourceOf('pushupGroundMetric')}
    return pushupGroundMetric;
  `)()
  const lm = Array.from({ length:33 }, () => ({ visibility:1 }))
  const world = Array.from({ length:33 }, () => ({ x:0, y:0, z:0 }))
  Object.assign(world[15], { x:-.3, y:0, z:0 })
  Object.assign(world[16], { x:.3, y:0, z:0 })
  Object.assign(world[31], { x:-.12, y:0, z:1 })
  Object.assign(world[32], { x:.12, y:0, z:1 })
  Object.assign(world[11], { x:-.2, y:-.4, z:.2 })
  Object.assign(world[12], { x:.2, y:-.4, z:.2 })
  Object.assign(world[23], { x:-.15, y:-.4, z:.6 })
  Object.assign(world[24], { x:.15, y:-.4, z:.6 })
  Object.assign(world[25], { x:-.12, y:-.25, z:.72 })
  Object.assign(world[26], { x:.12, y:-.25, z:.72 })

  assert.ok(metric(lm, world).ratio > .5, 'зөв plank-ийн өвдөг шалнаас хол байна')
  world[25].y = world[26].y = -.03
  assert.ok(metric(lm, world).ratio < .1, 'өвдөг газарт ойртоход ratio багасна')
  lm[31].visibility = .1
  assert.equal(metric(lm, world), null, 'тулгуур цэг найдваргүй бол таахгүй')
})

test('өвдөг газарт 5 frame тогтвортой байж зөрчил батлагдаад hysteresis-ээр гарна', () => {
  const advance = new Function(`
    const GROUND_CONTACT_RATIO=.16, GROUND_RELEASE_RATIO=.24;
    const GROUND_CONFIRM_FRAMES=5, GROUND_RELEASE_FRAMES=3;
    ${sourceOf('advancePushupGround')}
    return advancePushupGround;
  `)()
  let state = { contact:false, contactFrames:0, clearFrames:0 }
  for(let i=0;i<4;i++) state = advance(state, .08)
  assert.equal(state.contact, false)
  state = advance(state, .08)
  assert.equal(state.contact, true)
  state = advance(state, .2)
  assert.equal(state.contact, true, 'hysteresis мужид төлөв савлахгүй')
  state = advance(state, .5)
  state = advance(state, .5)
  assert.equal(state.contact, true)
  state = advance(state, .5)
  assert.equal(state.contact, false)
})

test('шинэ газар шалгалт зөвхөн энгийн solo push-up дээр ажиллана', () => {
  const enabled = new Function('mode', 'soloVariant', 'exercise', `
    ${sourceOf('normalPushupGroundEnabled')}
    return normalPushupGroundEnabled();
  `)
  assert.equal(enabled('solo', 'normal', 'pushup'), true)
  assert.equal(enabled('solo', 'game', 'pushup'), false)
  assert.equal(enabled('battle', 'normal', 'pushup'), false)
  assert.equal(enabled('solo', 'normal', 'squat'), false)
  assert.match(html, /if\(normalPushupGroundEnabled\(\)\)\{[\s\S]*?updatePushupGround/)
  assert.match(html, /normalPushupGroundEnabled\(\) && pushupGroundViolation/)
})
