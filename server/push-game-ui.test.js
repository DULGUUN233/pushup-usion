import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('Push Up нь энгийн болон Game гэсэн хоёр сонголттой', () => {
  assert.match(html, /id="pushChoice"/)
  assert.match(html, /id="pushNormal"[\s\S]*?<strong>Энгийн<\/strong>/)
  assert.match(html, /id="pushGame"[\s\S]*?<strong>Game<\/strong>/)
  assert.match(html, /\$\("navPush"\)\.onclick = openPushChoice/)
})

test('Game нь camera overlay canvas, score, rep, restart controls-той', () => {
  assert.match(html, /<canvas id="gameCanvas"/)
  assert.match(html, /id="pushGameScore"/)
  assert.match(html, /id="pushGameReps"/)
  assert.match(html, /id="pushGameRestart"/)
  assert.match(html, /id="pushGameExit"/)
  assert.match(html, /#gameEnd\{width:48px;height:48px/)
})

test('тохой нугарахад шувуу доош, тэнийхэд дээш явна', () => {
  const source = html.match(/function pushGameTargetY\(deg, anchorAngle = 170, anchorY = \.24\)\{[\s\S]*?\n\}/)?.[0]
  assert.ok(source, 'pushGameTargetY source олдсонгүй')
  const target = new Function(`${source}\nreturn pushGameTargetY`)()
  assert.ok(target(70) > target(170))
  assert.ok(target(70) <= 0.76 && target(170) >= 0.24)
  assert.equal(target(155, 155, 0.43), 0.43)
  assert.ok(target(95, 155, 0.43) > 0.7)
})

test('шувуу эхлэхдээ нүдний түвшинд таарч, game control raw өнцгийг хоцролтгүй дагана', () => {
  assert.match(html, /updatePushGameControl\(raw, now, mean\(lm, \[0,2,5\]\)\)/)
  assert.match(html, /if\(deg < 155 \|\| !Number\.isFinite\(eyeY\)\) return/)
  assert.match(html, /pushGameState\.anchorY = Math\.max\(\.14, Math\.min\(\.86, eyeY\)\)/)
  assert.match(html, /if\(Math\.abs\(delta\) > \.008\) pushGameState\.targetY = rawTarget/)
  assert.match(html, /pushGameState\.birdY = desiredY/)
})

test('дараагийн нүх хүрч болох өндөртэй бөгөөд төвтэй таарсныг хөдөлгөөн түгжихгүй харуулдаг', () => {
  const source = html.match(/function pushGameGapY\(height, gap, previous, startY, random = Math\.random\(\)\)\{[\s\S]*?\n\}/)?.[0]
  assert.ok(source, 'pushGameGapY source олдсонгүй')
  const gapY = new Function(`${source}\nreturn pushGameGapY`)()
  assert.ok(Math.abs(gapY(800, 240, 400, 400, 0) - 400) <= 125)
  assert.ok(Math.abs(gapY(800, 240, 400, 400, 1) - 400) <= 125)
  assert.match(html, /pushGameState\.locked = Math\.abs\(desiredY - gapCenter\) <= lockRange/)
  assert.doesNotMatch(html, /ТҮВШИН ТОГТЛОО/)
  assert.doesNotMatch(html, /desiredY = gapCenter/)
  assert.match(html, /prefers-reduced-motion: reduce/)
})

test('tracking тасрахад game pause хийж, camera хаахад loop цэвэрлэгдэнэ', () => {
  assert.match(html, /now - pushGameState\.lastPoseAt > 900/)
  assert.match(html, /const tracked = pushGameState\.poseReady && now - pushGameState\.lastPoseAt <= 900/)
  assert.match(html, /function stopCamera\(\)\{[\s\S]*?stopPushGame\(\)/)
  assert.match(html, /if\(soloVariant === "game"\) startPushGame\(\)/)
})
