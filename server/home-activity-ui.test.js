import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('Нүүрийн activity өдөр, 7 хоног, сарын гурван харагдацтай', () => {
  assert.match(html, /id="dailyPushups"[^>]*aria-label="Дасгалын статистик"/)
  assert.match(html, /class="activityRangeSwitch"[^>]*role="group"/)
  assert.match(html, /id="activityDay"[^>]*aria-pressed="true">D</)
  assert.match(html, /id="activityWeek"[^>]*aria-pressed="false">W</)
  assert.match(html, /id="activityMonth"[^>]*aria-pressed="false">M</)
  assert.match(html, /id="dailyRingValue"/)
  assert.match(html, /id="activityWeekChart"/)
  assert.match(html, /id="activityMonthGrid"/)
})

test('өдрийн тойрог дасгалын нэрийн оронд огноо харуулж, хугацааны сумнууд төвдөө байна', () => {
  assert.match(html, /<time id="dailyActivityDate" datetime=""><\/time>/)
  assert.doesNotMatch(html, /id="dailyPushupsTitle"/)
  assert.doesNotMatch(html, /const exerciseLabel =/)
  assert.match(html, /const exerciseA11yLabel = isSquat \? "суулт" : "суниалт"/)
  assert.equal((html.match(/\$\{exerciseA11yLabel\}/g) || []).length, 2)
  assert.match(html, /function activityDateDisplay\(dateKey\)\{[\s\S]*?if\(dateKey === activityDateKey\(\)\) return "Өнөөдөр";[\s\S]*?return `\$\{year\}\.\$\{month\}\.\$\{day\}`/)
  assert.match(html, /\$\("dailyActivityDate"\)\.dateTime = activityAnchor/)
  assert.match(html, /id="activityPeriodLabel" class="srOnly"/)
  assert.match(html, /\.activityPeriodNav\{display:none\}/)
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
  assert.match(html, /\.activityWeekDay\{[^}]*grid-template-rows:18px 1fr/s)
  assert.match(html, /plot\.className = "activityWeekPlot"/)
  assert.match(html, /zero\.className = "activityWeekZero"/)
  assert.match(html, /if\(day\.reps\)\{[\s\S]*?barHeight = Math\.max\(18, day\.reps \/ weekMax \* 84\)/)
  assert.doesNotMatch(html, /activityWeekBarTrack/)
  assert.match(html, /className = "activityMonthDay"/)
  assert.match(html, /id="activityMonthTitle"/)
  assert.match(html, /\$\("activityMonthTitle"\)\.textContent = activityPeriodTitle\(period\)/)
  assert.match(html, /--activity-progress/)
  assert.match(html, /button\.classList\.add\("complete"\)/)
  assert.match(html, /button\.classList\.add\("partial"\)/)
  assert.match(html, /button\.classList\.add\("empty"\)/)
  assert.match(html, /button\.onclick = \(\) => openActivityDay\(day\.date\)/)
  assert.match(html, /const DAILY_GOALS = \{ pushup:20, squat:20 \}/)
  assert.match(html, /Math\.min\(100, day\.reps \/ DAILY_GOALS\[activityExercise\] \* 100\)/)
  assert.match(html, /id="activityMonthAverage" class="activityAverage">0<\/strong><small>ӨДРИЙН ДУНДАЖ/)
  assert.match(html, /\.activitySummary \.activityAverage\{color:var\(--fg\);font-size:29px;font-weight:900\}/)
  assert.match(html, /\.activityMonthDay\.complete::before\{[^}]*linear-gradient/s)
  assert.match(html, /\.activityMonthDay\.complete::after\{display:none\}/)
  assert.match(html, /\.activityMonthDay\.empty::before\{[^}]*rgba\(255,255,255,\.075\)/s)
  assert.match(html, /\.activityMonthDay\.empty::after\{display:none\}/)
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

test('Нүүрийн content дээр давхардсан Battle Friend CTA байхгүй', () => {
  assert.doesNotMatch(html, /id="mBattle"/)
  assert.doesNotMatch(html, /id="mPush"|id="mSquat"/)
})

test('Battle Friend доод navigation-ийн голд өргөгдсөн үндсэн action байна', () => {
  const push = html.indexOf('id="navPush"')
  const battle = html.indexOf('id="navBattle"')
  const squat = html.indexOf('id="navSquat"')
  assert.ok(push > -1 && push < battle && battle < squat)
  assert.match(html, /id="navBattle"[^>]*aria-label="Battle Friend"/)
  assert.match(html, /class="navBattleOrb"/)
  assert.match(html, /class="navExerciseIcon navPushIcon"/)
  assert.match(html, /class="navExerciseIcon navSquatIcon"/)
  assert.match(html, /#mainNav #navBattle\{height:52px;min-height:52px;[^}]*transform:translateY\(-12px\)/)
  assert.match(html, /\.navBattleOrb\{width:50px;height:50px;[^}]*border-radius:50%/)
  assert.match(html, /background:linear-gradient\(135deg,#f97316 0%,#fbbf24 100%\)/)
  assert.match(html, /\$\("navBattle"\)\.onclick = startBattle/)
  assert.match(html, /#menu\{[^}]*padding-bottom:calc\(env\(safe-area-inset-bottom\) \+ 104px\)/)
})

test('Нүүрийн урт content navigation-ийн цаагуур scroll хийнэ', () => {
  assert.match(html, /#menu\{[^}]*overflow-y:auto;[^}]*scroll-padding-bottom:calc\(env\(safe-area-inset-bottom\) \+ 104px\)/)
  assert.match(html, /#menu>\*\{flex-shrink:0\}/)
  assert.match(html, /#menu\{[^}]*-webkit-overflow-scrolling:touch/)
})

test('activity switch давхар pill-гүй flat underline tab бөгөөд mobile touch target-аа хадгална', () => {
  assert.match(html, /\.activitySwitch\{position:relative;isolation:isolate;align-self:center;width:170px;height:48px/)
  assert.match(html, /grid-template-columns:1fr 1fr;gap:0;background:transparent;border:0;box-shadow:none/)
  assert.match(html, /\.activitySwitch button\{position:relative;z-index:1;min-width:0;height:44px/)
  assert.match(html, /\.activitySwitch button\[aria-pressed="true"\]\{color:var\(--activity\);font-weight:900\}/)
  assert.match(html, /\.activitySwitch \.activityTabsPill\{bottom:0;height:3px;border-radius:999px/)
  assert.match(html, /transparent calc\(50% - 18px\),var\(--activity\)/)
  assert.match(html, /\.activityRangeSwitch button\{position:relative;z-index:1;width:52px;min-height:44px/)
})

test('activity tab-ууд сонголт руугаа sliding pill animation-тай', () => {
  assert.equal((html.match(/class="activityTabsPill"/g) || []).length, 2)
  assert.match(html, /\.activityTabsPill\{[^}]*transform:translateX\(0\);[^}]*transition:transform 250ms cubic-bezier\(\.22,1,\.36,1\),width 250ms/s)
  assert.match(html, /pill\.style\.transform = `translateX\(\$\{active\.offsetLeft\}px\)`/)
  assert.match(html, /pill\.style\.width = `\$\{active\.offsetWidth\}px`/)
  assert.match(html, /if\(!animate\) pill\.style\.transition = "none"/)
  assert.match(html, /requestAnimationFrame\(\(\) => syncActivityTabsPills\(false\)\)/)
  assert.match(html, /prefers-reduced-motion:reduce[^}]*\{[\s\S]*?\.activityTabsPill[^}]*transition:none!important/)
})

test('Нүүр Carbon Ember background болон surface hierarchy ашиглана', () => {
  assert.match(html, /#menu\{--home-bg:#0b0d10;--home-bg-deep:#07080a;--home-card:#181c22/)
  assert.match(html, /--home-primary:#f97316;--home-secondary:#fbbf24/)
  assert.match(html, /#menu\{[^}]*radial-gradient\(circle at 50% -8%,rgba\(249,115,22,\.16\),transparent 35%\)[^}]*linear-gradient\(180deg,var\(--home-bg\) 0%,#101116 54%,var\(--home-bg-deep\) 100%\)/s)
  assert.match(html, /\.dailyRingCard\{[^}]*background:transparent;border:0;box-shadow:none/s)
  assert.doesNotMatch(html, /\.dailyRingCard::after/)
  assert.match(html, /#mainNav\{[^}]*background:rgba\(11,13,16,\.95\)[^}]*backdrop-filter:blur\(20px\)/s)
})

test('Нүүр Usion-ийн жижиг утасны viewport-д нягтарна', () => {
  assert.match(html, /@media \(max-width:360px\)\{[\s\S]*?#menu\{gap:12px;padding-left:14px;padding-right:14px/)
  assert.match(html, /@media \(max-width:360px\)\{[\s\S]*?#mainNav button\{min-height:50px/)
  assert.match(html, /@media \(max-width:360px\)\{[\s\S]*?#mainNav #navBattle\{height:50px;min-height:50px;transform:translateY\(-10px\)/)
})

test('Push Up сонголт, Суулт бэлтгэл дэлгэцийг доод navigation-аас нээнэ', () => {
  assert.match(html, /\$\("navPush"\)\.onclick = openPushChoice/)
  assert.match(html, /\$\("navSquat"\)\.onclick = \(\) => openSolo\("squat"\)/)
})
