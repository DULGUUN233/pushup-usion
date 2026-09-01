import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('Push Up нь энгийн болон Game гэсэн хоёр сонголттой', () => {
  assert.match(html, /id="pushChoice"/)
  assert.match(html, /id="pushNormal"[\s\S]*?<strong>Энгийн<\/strong>/)
  assert.match(html, /id="pushGame"[\s\S]*?<strong>Game<\/strong>/)
  assert.match(html, /\$\("navPush"\)\.onclick = \(\) => \{ prepareMainNavDestination\(\); openPushChoice\(\); \}/)
})

test('exercise chooser and camera prep share Carbon Ember UI and Usion system back', () => {
  assert.match(html, /#pushChoice\{--choice-bg:#0b0d10/)
  assert.match(html, /\.pushChoiceCard\{min-height:108px/)
  assert.match(html, /@keyframes choiceEnter/)
  assert.match(html, /#start\{--prep-surface:#181c22/)
  assert.match(html, /#go\{min-width:190px;min-height:50px[\s\S]*?linear-gradient/)
  assert.match(html, /@keyframes prepEnter/)
  assert.doesNotMatch(html, /id="pushChoiceBack"/)
  assert.doesNotMatch(html, /id="pBack"/)
  assert.match(html, /if\(id === "pushChoice"\) return void u\.claimBackButton\(\(\) => show\("menu"\)\)/)
  assert.match(html, /show\(id === "play" && exercise === "pushup" \? "pushChoice" : "menu"\)/)
})

test('горимын card-ууд generated local PNG asset ашиглана', () => {
  assert.match(html, /preload" as="image" href="\.\/assets\/modes\/pushup-mode-v1\.png"/)
  assert.match(html, /id="pushNormal"[\s\S]*?<img src="\.\/assets\/modes\/pushup-mode-v1\.png"/)
  assert.match(html, /id="pushGame"[\s\S]*?<img src="\.\/assets\/modes\/game-mode-v1\.png"/)
  assert.match(html, /\.pushChoiceIcon img\{width:48px;height:48px/)
})

test('Game нь camera overlay canvas, score, rep, restart controls-той', () => {
  assert.match(html, /<canvas id="gameCanvas"/)
  assert.match(html, /id="pushGameScore"/)
  assert.match(html, /id="pushGameReps"/)
  assert.match(html, /id="pushGameRestart"/)
  assert.match(html, /id="pushGameExit"/)
  assert.match(html, /#gameEnd\{width:48px;height:48px/)
})

test('Flappy эхлэх дэлгэц project-local шинэ onboarding зураг ашиглана', () => {
  assert.match(html, /id="howtoGame"[\s\S]*?src="\.\/assets\/flappy\/game-howto-v2\.webp"/)
})

test('Game дээр тохой болон биеийн skeleton тоглоомын дээр тод харагдана', () => {
  assert.match(html, /#play\.push-game #canvas\{opacity:\.74;z-index:3;pointer-events:none\}/)
  assert.match(html, /\n  drawSkeleton\(lm\);\n  if\(mode === "solo" && soloVariant === "game"/)
  assert.doesNotMatch(html, /soloVariant !== "game" \|\| mode === "battle"/)
})

test('бүтэн тэнийлт шувууны дээд, 90 градус доод endpoint байна', () => {
  const source = html.match(/function pushGameTargetY\(deg, anchorAngle = 170, anchorY = \.24\)\{[\s\S]*?\n\}/)?.[0]
  assert.ok(source, 'pushGameTargetY source олдсонгүй')
  const target = new Function(`${source}\nreturn pushGameTargetY`)()
  assert.ok(target(70) > target(170))
  assert.ok(target(70) <= 0.78 && target(170) >= 0.22)
  assert.equal(target(155, 155, 0.43), 0.43)
  assert.ok(target(95, 155, 0.43) > 0.7)
  assert.equal(target(166, 170, 0.3), 0.3)
  assert.equal(target(90, 170, 0.3), 0.78)
  assert.equal(target(92, 170, 0.3), target(80, 170, 0.3))
  assert.ok(target(98, 170, 0.3) < target(90, 170, 0.3))
})

test('шувуу эхлэхдээ нүдний түвшинд таарч, adaptive dead-zone чичиргээг дарна', () => {
  assert.match(html, /updatePushGameControl\(raw, now, mean\(lm, \[0,2,5\]\)\)/)
  assert.match(html, /if\(deg < 155 \|\| !Number\.isFinite\(eyeY\)\) return/)
  assert.match(html, /pushGameState\.anchorY = Math\.max\(\.22, Math\.min\(\.5, eyeY\)\)/)
  const source = html.match(/function pushGameStableY\(current, next\)\{[\s\S]*?\n\}/)?.[0]
  assert.ok(source, 'pushGameStableY source олдсонгүй')
  const stableY = new Function(`${source}\nreturn pushGameStableY`)()
  assert.equal(stableY(.5, .51), .5)
  assert.ok(stableY(.5, .7) > .68)
  const smoothSource = html.match(/function pushGameSmoothY\(current, target, dt, reducedMotion = pushGameReducedMotion\)\{[\s\S]*?\n\}/)?.[0]
  assert.ok(smoothSource, 'pushGameSmoothY source олдсонгүй')
  const smoothY = new Function(`${smoothSource}\nreturn pushGameSmoothY`)()
  const first = smoothY(.25, .7, 1 / 60, false)
  assert.ok(first > .25 && first < .7, 'render frame бүрд зорилго руу зөөлөн ойртоно')
  assert.equal(smoothY(.25, .7, 1 / 60, true), .7, 'reduced motion үед шууд байрлана')
  assert.match(html, /pushGameState\.birdY = pushGameSmoothY\(pushGameState\.birdY, desiredY, dt\)/)
})

test('Flappy урагшлах хурд өмнөхөөс бага зэрэг нэмэгдсэн', () => {
  assert.match(html, /const speed = Math\.max\(112, width \* \.31\)/)
})

test('Flappy түвшин тогтсоны дараах анхны тохой нугаралтаар эхэлнэ', () => {
  assert.match(html, /poseReady:false, started:false/)
  assert.match(html, /deg <= Math\.min\(145, pushGameState\.anchorAngle - 18\)/)
  assert.match(html, /pushGameState\.started = true/)
  assert.match(html, /const started = tracked && pushGameState\.started/)
  assert.match(html, /"Тохойгоо нугал", "Анхны push-up хийхэд тоглоом эхэлнэ"/)
  assert.doesNotMatch(html, /readyAt = now \+ 1200/)
})

test('Flappy хажуугийн meter шувуу болон дараагийн нүхний түвшнийг харуулна', () => {
  assert.doesNotMatch(html, /#play\.push-game #deepGlow,#play\.push-game #meterWrap/)
  assert.match(html, /#play\.push-game #meterWrap\{display:block[^}]*height:min\(44vh,340px\)/)
  assert.match(html, /function updatePushGameLevelMeter\(height, targetPipe\)[\s\S]*?\(1 - pushGameState\.birdY\) \* 100/)
  assert.match(html, /\(1 - targetPipe\.gapY \/ height\) \* 100/)
  assert.match(html, /updatePushGameLevelMeter\(height, lockPipe\)/)
})

test('Flappy source-ийн local bird, pipe asset-уудыг preload хийгээд canvas дээр зурна', () => {
  assert.match(html, /preload" as="image" href="\.\/assets\/flappy\/bird-mid\.png"/)
  assert.match(html, /pushGameImage\("\.\/assets\/flappy\/pipe-cap\.png"\)/)
  assert.match(html, /drawImage\(pushGameAssets\.bird/)
  assert.match(html, /drawImage\(pushGameAssets\.pipeBody/)
  assert.doesNotMatch(html, /Math\.sin\(now \/ 105\)/)
})

test('саадны голын target нь generated жимс болж, дээд голд streak харагдана', () => {
  assert.match(html, /preload" as="image" href="\.\/assets\/flappy\/fruit-orange-v1\.webp"/)
  assert.match(html, /fruit:pushGameImage\("\.\/assets\/flappy\/fruit-orange-v1\.webp"\)/)
  assert.match(html, /id="pushGameStreak" class="pushGameStreak" role="status" aria-live="polite"/)
  assert.match(html, /\.pushGameStreak\{position:absolute;left:50%;top:1px;transform:translateX\(-50%\)/)
  assert.match(html, /\.pushGameStreak img\{width:44px;height:44px/)
  assert.match(html, /drawImage\(pushGameAssets\.fruit, targetX - fruitRadius/)
  assert.doesNotMatch(html, /gameCtx\.arc\(targetX, nextPipe\.gapY, 8/)
})

test('жимс авбал streak нэмэгдэж, алдвал тэг болно', () => {
  assert.match(html, /score:0, streak:0/)
  assert.match(html, /fruitDistance <= radius \+ fruitRadius \* \.72/)
  assert.match(html, /updatePushGameStreak\(pushGameState\.streak \+ 1, "gained"\)/)
  assert.match(html, /fruitX \+ fruitRadius < birdX - radius/)
  assert.match(html, /updatePushGameStreak\(0, "missed"\)/)
  assert.match(html, /@keyframes pushGameStreakGain/)
  assert.match(html, /\.t-digit-group \.t-digit \{ animation: none !important; \}/)
})

test('саад хэт захад гарахгүй, дараагийн gap хүрч болох зайд random байрлана', () => {
  const source = html.match(/function pushGameGapY\(height, gap, previous = null, random = Math\.random\(\),[\s\S]*?\n\}/)?.[0]
  assert.ok(source, 'pushGameGapY source олдсонгүй')
  const gapY = new Function(`${source}\nreturn pushGameGapY`)()
  assert.equal(gapY(800, 240, null, 0), 240)
  assert.equal(gapY(800, 240, null, 1), 560)
  assert.equal(gapY(800, 240, null, .5), 400)
  assert.equal(gapY(800, 240, 400, 0), 256)
  assert.equal(gapY(800, 240, 400, 1), 544)
  assert.equal(gapY(800, 240, null, 0, .43, .78), 344)
  assert.equal(gapY(800, 240, null, 1, .43, .78), 560)
  assert.equal(gapY(800, 240, null, 0, .22, .61), 240)
  assert.equal(gapY(800, 240, null, 1, .22, .61), 488)
  assert.equal(gapY(200, 154, null, .5, .5, .78), 120)
  const targetSource = html.match(/function pushGameTargetY\(deg, anchorAngle = 170, anchorY = \.24\)\{[\s\S]*?\n\}/)?.[0]
  const target = new Function(`${targetSource}\nreturn pushGameTargetY`)()
  for(const anchorAngle of [155, 170, 180]){
    for(const anchorY of [.22, .35, .5]){
      const top = target(anchorAngle, anchorAngle, anchorY)
      const bottom = target(90, anchorAngle, anchorY)
      const minReach = Math.max(.3, Math.min(top, bottom))
      const maxReach = Math.min(.7, Math.max(top, bottom))
      for(const random of [0, .25, .5, .75, 1]){
        const y = gapY(800, 240, null, random, top, bottom) / 800
        assert.ok(y >= minReach && y <= maxReach,
          `gap ${y} нь ${minReach}–${maxReach} хүрээнээс гарлаа`)
      }
      const previous = 800 * ((minReach + maxReach) / 2)
      const stepped = gapY(800, 240, previous, 1, top, bottom)
      assert.ok(Math.abs(stepped - previous) <= 800 * .18)
      assert.ok(stepped / 800 >= minReach && stepped / 800 <= maxReach)
    }
  }
  assert.match(html, /const reachableTop = pushGameTargetY\(pushGameState\.anchorAngle/)
  assert.match(html, /const reachableBottom = pushGameTargetY\(90, pushGameState\.anchorAngle/)
  assert.match(html, /reachableTop, reachableBottom\)/)
  assert.match(html, /pushGameState\.lastGapY = gapY/)
  assert.doesNotMatch(html, /nextLane/)
  assert.match(html, /pushGameState\.locked = Math\.abs\(pushGameState\.birdY - gapCenter\) <= lockRange/)
  assert.doesNotMatch(html, /ТҮВШИН ТОГТЛОО/)
  assert.doesNotMatch(html, /desiredY = gapCenter/)
  assert.match(html, /prefers-reduced-motion:\s*reduce/)
})

test('tracking тасрахад game pause хийж, camera хаахад loop цэвэрлэгдэнэ', () => {
  assert.match(html, /now - pushGameState\.lastPoseAt > 900/)
  assert.match(html, /const tracked = pushGameState\.poseReady && now - pushGameState\.lastPoseAt <= 900/)
  assert.match(html, /function stopCamera\(\)\{[\s\S]*?stopPushGame\(\)/)
  assert.match(html, /if\(soloVariant === "game"\) startPushGame\(\)/)
})

test('Flappy game дуусахад хамгийн өндөр оноог серверт хадгалж, алдахад дахин илгээхээр үлдээнэ', () => {
  assert.match(html, /finishPushGame[\s\S]*?saveFlappyScore\(pushGameState\.score\)/)
  assert.match(html, /api\("\/flappy-score", \{ method:"POST", body:JSON\.stringify\(\{ score:best \}\) \}\)/)
  assert.match(html, /FLAPPY_PENDING_KEY/)
  assert.match(html, /loadProfile\(\)[\s\S]*?saveFlappyScore\(readPendingFlappyScore\(\)\)/)
})

test('Flappy оноог 5 секунд харуулаад автоматаар дахин эхэлнэ', () => {
  assert.match(html, /function finishPushGame\(title = "Тоглоом дууслаа", autoRestart = true\)/)
  assert.match(html, /pushGameState\.restartTimer = setTimeout\(\(\) => \{[\s\S]*?reset\(\);[\s\S]*?startPushGame\(\);[\s\S]*?\}, 5000\)/)
  assert.match(html, /function stopPushGame\(\)[\s\S]*?clearTimeout\(pushGameState\.restartTimer\)/)
  assert.match(html, /\$\("gameEnd"\)\.onclick = \(\) => finishPushGame\("Тоглоом зогслоо", false\)/)
})
