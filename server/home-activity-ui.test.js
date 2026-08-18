import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('Нүүрийн activity өдөр, 7 хоног, сарын гурван харагдацтай', () => {
  assert.match(html, /id="dailyPushups"[^>]*aria-labelledby="dailyPushupsTitle"/)
  assert.match(html, /class="activityRangeSwitch"[^>]*role="group"/)
  assert.match(html, /id="activityDay"[^>]*aria-pressed="true">D</)
  assert.match(html, /id="activityWeek"[^>]*aria-pressed="false">W</)
  assert.match(html, /id="activityMonth"[^>]*aria-pressed="false">M</)
  assert.match(html, /id="dailyRingValue"/)
  assert.match(html, /id="activityWeekChart"/)
  assert.match(html, /id="activityMonthGrid"/)
})

test('activity үзүүлэлт Суниалт ба Суулт compact switch-тэй', () => {
  assert.match(html, /class="activitySwitch"[^>]*role="group"/)
  assert.match(html, /id="activityPush"[^>]*aria-pressed="true">Суниалт/)
  assert.match(html, /id="activitySquat"[^>]*aria-pressed="false">Суулт/)
  assert.match(html, /\$\("activityPush"\)\.onclick = \(\) => selectActivity\("pushup"\)/)
  assert.match(html, /\$\("activitySquat"\)\.onclick = \(\) => selectActivity\("squat"\)/)
  const cardHeader = html.match(/<div id="activityViewport"[\s\S]*?<div class="activityPeriodNav">/)?.[0] ?? ''
  assert.match(cardHeader, /class="activitySwitch"/)
})

test('Нүүрийн давхардсан нийт, байр, ELO карт харагдахгүй', () => {
  assert.doesNotMatch(html, /id="card"|id="cTotal"|id="cRank"|id="cElo"/)
})

test('профайлын нэрийн доор W, L, PU, SQ тоонууд харагдахгүй', () => {
  assert.doesNotMatch(html, /id="sub"|profile\.wins\}W|profile\.losses\}L/)
})

test('Нүүр дээр profile header харагдахгүй', () => {
  assert.doesNotMatch(html, /id="who"|id="avatar"|id="nm"/)
  assert.doesNotMatch(html, /function renderProfile\(/)
})

test('өдрийн activity хэрэглэгчийн timezone-аар серверээс ачаална', () => {
  assert.match(html, /resolvedOptions\(\)\.timeZone/)
  assert.match(html, /api\(`\/activity\?days=\$\{days\}&end=\$\{end\}&exercise=\$\{exercise\}&timeZone=\$\{encodeURIComponent\(localTimeZone\)\}`\)/)
  assert.match(html, /loadDailyActivity\(\)/)
})

test('activity-г swipe болон суман товчоор өмнөх хугацаа руу шилжүүлнэ', () => {
  assert.match(html, /id="activityPrev"[^>]*aria-label="Өмнөх хугацаа"/)
  assert.match(html, /id="activityNext"[^>]*aria-label="Дараагийн хугацаа"[^>]*disabled/)
  assert.match(html, /touch-action:pan-y/)
  assert.match(html, /addEventListener\("pointerdown"/)
  assert.match(html, /Math\.abs\(deltaX\) < 52/)
  assert.match(html, /shiftActivityPeriod\(deltaX > 0 \? -1 : 1\)/)
  assert.match(html, /if\(direction > 0 && \$\("activityNext"\)\.disabled\) return/)
})

test('7 хоног нь bar chart, сар нь өдрийн progress calendar харуулна', () => {
  assert.match(html, /bar\.className = "activityWeekBar"/)
  assert.match(html, /grid-template-columns:repeat\(7,1fr\)/)
  assert.match(html, /className = "activityMonthDay"/)
  assert.match(html, /--activity-progress/)
  assert.match(html, /button\.onclick = \(\) => openActivityDay\(day\.date\)/)
  assert.match(html, /const DAILY_GOALS = \{ pushup:20, squat:20 \}/)
  assert.match(html, /Math\.min\(100, day\.reps \/ DAILY_GOALS\[activityExercise\] \* 100\)/)
  assert.match(html, /id="activityMonthAverage" class="activityAverage">0<\/strong><small>ӨДРИЙН ДУНДАЖ/)
  assert.match(html, /\.activitySummary \.activityAverage\{color:var\(--fg\);font-size:29px;font-weight:900\}/)
})

test('өдрийн activity cache-ээс шууд харагдаад profile-тэй зэрэг шинэчлэгдэнэ', () => {
  assert.match(html, /function restoreDailyActivity\(exercise\)/)
  assert.match(html, /localStorage\.setItem\(activityCacheKey\(exercise\)/)
  assert.match(html, /restoreDailyActivity\("pushup"\);[\s\S]*?restoreDailyActivity\("squat"\);/)
  assert.match(html, /const startupTasks = \[loadProfile\(\), loadDailyActivity\(\)\];/)
  assert.match(html, /if\(CHALLENGES_ENABLED\) startupTasks\.push\(loadChallenges\(\)\);/)
  assert.match(html, /const startupReady = Promise\.allSettled\(startupTasks\.map/)
  assert.match(html, /await Promise\.race\(\[\s*startupReady,/)
  assert.match(html, /addDailyActivityReps\(kind, reps\);/)
  const profileSource = html.match(/async function loadProfile\(\)\{[\s\S]*?\n\}/)?.[0] ?? ''
  assert.doesNotMatch(profileSource, /loadDailyActivity/)
})

test('Нүүр дээр daily summary-ийн дараа зөвхөн Battle Friend товч байна', () => {
  const daily = html.indexOf('id="dailyPushups"')
  const battle = html.indexOf('id="mBattle"')
  assert.ok(daily > -1 && daily < battle)
  assert.match(html, /id="mBattle">Battle Friend<small>Найзтайгаа өрсөлдөх<\/small>/)
  assert.doesNotMatch(html, /id="mPush"|id="mSquat"/)
})

test('Battle Friend товч navigation-ийн дээр тод үндсэн CTA байна', () => {
  assert.match(html, /#mBattle\{position:fixed;left:50%;bottom:calc\(env\(safe-area-inset-bottom\) \+ 80px\)/)
  assert.match(html, /background:linear-gradient\(135deg,#39d98a 0%,#20b8ff 100%\)/)
  assert.match(html, /#mBattle\{[^}]*min-height:52px;[^}]*padding:6px 16px/s)
  assert.match(html, /#menu\{[^}]*padding-bottom:calc\(env\(safe-area-inset-bottom\) \+ 172px\)/)
})

test('Нүүрийн урт content fixed CTA болон navigation-ийн цаагуур scroll хийнэ', () => {
  assert.match(html, /#menu\{[^}]*overflow-y:auto;[^}]*scroll-padding-bottom:calc\(env\(safe-area-inset-bottom\) \+ 172px\)/)
  assert.match(html, /#menu>\*\{flex-shrink:0\}/)
  assert.match(html, /#menu\{[^}]*-webkit-overflow-scrolling:touch/)
})

test('activity switch нягт боловч mobile touch target-аа хадгална', () => {
  assert.match(html, /\.activitySwitch\{position:relative;isolation:isolate;align-self:center;width:156px;height:44px/)
  assert.match(html, /\.activitySwitch button\{min-width:0;height:44px/)
  assert.match(html, /background-size:calc\(100% - 4px\) 34px/)
  assert.match(html, /\.activityRangeSwitch button\{width:52px;min-height:44px/)
  assert.match(html, /\.activityPeriodNav button\{width:44px;height:44px/)
})

test('Push Up сонголт, Суулт бэлтгэл дэлгэцийг доод navigation-аас нээнэ', () => {
  assert.match(html, /\$\("navPush"\)\.onclick = openPushChoice/)
  assert.match(html, /\$\("navSquat"\)\.onclick = \(\) => openSolo\("squat"\)/)
})
