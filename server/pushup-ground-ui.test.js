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

test('урдаас авсан kneeling байрлалыг хоёр хөлийн 2D нугаралтаар барина', () => {
  const metric = new Function(`
    const LEGS=[[23,25,27],[24,26,28]];
    const GROUND_KNEE_VIS_MIN=.4, GROUND_KNEE_2D_CONTACT=145, GROUND_KNEE_2D_RELEASE=158;
    const GROUND_KNEE_LAYOUT_VIS_MIN=.35, GROUND_KNEE_LAYOUT_SPREAD=.55, GROUND_KNEE_LAYOUT_WIDTH_RATIO=1.6;
    const angle3=(a,b,c)=>{
      const ux=a.x-b.x, uy=a.y-b.y, uz=a.z-b.z;
      const vx=c.x-b.x, vy=c.y-b.y, vz=c.z-b.z;
      const den=Math.hypot(ux,uy,uz)*Math.hypot(vx,vy,vz);
      return den ? Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy+uz*vz)/den)))*180/Math.PI : null;
    };
    ${sourceOf('pushupKneePoseMetric')}
    return pushupKneePoseMetric;
  `)()
  const lm = Array.from({ length:33 }, () => ({ x:.5, y:.5, visibility:1 }))
  Object.assign(lm[23], { x:.48, y:.545 });
  Object.assign(lm[25], { x:.245, y:.577 });
  Object.assign(lm[27], { x:.139, y:.665 });
  Object.assign(lm[24], { x:.63, y:.54 });
  Object.assign(lm[26], { x:.83, y:.555 });
  Object.assign(lm[28], { x:.883, y:.67 });
  assert.equal(metric(lm, .56).ratio, 0, 'зураг дээрх kneeling байрлал contact болно')

  Object.assign(lm[25], { x:.45, y:.66 });
  Object.assign(lm[27], { x:.42, y:.78 });
  Object.assign(lm[26], { x:.66, y:.655 });
  Object.assign(lm[28], { x:.69, y:.77 });
  assert.equal(metric(lm, .56).ratio, 1, 'хоёр хөл шулуун бол clear болно')
})

test('Flappy дунд шагай халхлагдсан ч урд талын өвдөглөсөн хэлбэрийг барина', () => {
  const metric = new Function(`
    const LEGS=[[23,25,27],[24,26,28]];
    const GROUND_KNEE_VIS_MIN=.4, GROUND_KNEE_2D_CONTACT=145, GROUND_KNEE_2D_RELEASE=158;
    const GROUND_KNEE_LAYOUT_VIS_MIN=.35, GROUND_KNEE_LAYOUT_SPREAD=.55, GROUND_KNEE_LAYOUT_WIDTH_RATIO=1.6;
    const angle3=(a,b,c)=>{
      const ux=a.x-b.x, uy=a.y-b.y, uz=a.z-b.z;
      const vx=c.x-b.x, vy=c.y-b.y, vz=c.z-b.z;
      const den=Math.hypot(ux,uy,uz)*Math.hypot(vx,vy,vz);
      return den ? Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy+uz*vz)/den)))*180/Math.PI : null;
    };
    ${sourceOf('pushupKneePoseMetric')}
    return pushupKneePoseMetric;
  `)()
  const lm = Array.from({ length:33 }, () => ({ x:.5, y:.5, visibility:1 }))
  Object.assign(lm[11], { x:.43, y:.48 });
  Object.assign(lm[12], { x:.57, y:.48 });
  Object.assign(lm[23], { x:.48, y:.56 });
  Object.assign(lm[24], { x:.62, y:.56 });
  Object.assign(lm[25], { x:.24, y:.61 });
  Object.assign(lm[26], { x:.85, y:.60 });
  lm[27].visibility = .12;
  lm[28].visibility = .08;
  assert.equal(metric(lm, .56).ratio, 0, 'шагайгүй ч хоёр өвдөг дэлгэгдсэн бол contact')

  Object.assign(lm[25], { x:.47, y:.68 });
  Object.assign(lm[26], { x:.64, y:.68 });
  assert.equal(metric(lm, .56), null, 'шагайгүй зөв шулуун layout-ийг contact гэж таахгүй')

  Object.assign(lm[25], { x:.40, y:.67 });
  Object.assign(lm[26], { x:.70, y:.67 });
  assert.equal(metric(lm, .56), null, 'өвдөг бага зэрэг зайтай зөв plank-ийг contact болгохгүй')
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
