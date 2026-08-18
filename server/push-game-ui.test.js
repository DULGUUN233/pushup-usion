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
  const source = html.match(/function pushGameTargetY\(deg\)\{[\s\S]*?\n\}/)?.[0]
  assert.ok(source, 'pushGameTargetY source олдсонгүй')
  const target = new Function(`${source}\nreturn pushGameTargetY`)()
  assert.ok(target(70) > target(170))
  assert.ok(target(70) <= 0.76 && target(170) >= 0.24)
})

test('tracking тасрахад game pause хийж, camera хаахад loop цэвэрлэгдэнэ', () => {
  assert.match(html, /now - pushGameState\.lastPoseAt > 900/)
  assert.match(html, /const tracked = pushGameState\.poseReady && now - pushGameState\.lastPoseAt <= 900/)
  assert.match(html, /function stopCamera\(\)\{[\s\S]*?stopPushGame\(\)/)
  assert.match(html, /if\(soloVariant === "game"\) startPushGame\(\)/)
})
