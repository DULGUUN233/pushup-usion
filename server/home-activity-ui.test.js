import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('Нүүр дээр өнөөдрийн push-up ring ба 7 өдрийн график байна', () => {
  assert.match(html, /id="dailyPushups"[^>]*aria-labelledby="dailyPushupsTitle"/)
  assert.match(html, /id="dailyRingValue"/)
  assert.match(html, /id="dailyCount">0</)
  assert.match(html, /id="weekChart"/)
  assert.match(html, /id="weekLabels"/)
})

test('өдрийн үзүүлэлт Push Up ба Суулт switch-тэй', () => {
  assert.match(html, /class="activitySwitch"[^>]*role="group"/)
  assert.match(html, /id="activityPush"[^>]*aria-pressed="true">Push Up/)
  assert.match(html, /id="activitySquat"[^>]*aria-pressed="false">Суулт/)
  assert.match(html, /\$\("activityPush"\)\.onclick = \(\) => selectActivity\("pushup"\)/)
  assert.match(html, /\$\("activitySquat"\)\.onclick = \(\) => selectActivity\("squat"\)/)
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
  assert.match(html, /api\(`\/activity\?days=7&exercise=\$\{exercise\}&timeZone=\$\{encodeURIComponent\(localTimeZone\)\}`\)/)
  assert.match(html, /activityWeekdays = \["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"\]/)
  assert.match(html, /loadDailyActivity\(\)/)
})

test('өдрийн activity cache-ээс шууд харагдаад profile-тэй зэрэг шинэчлэгдэнэ', () => {
  assert.match(html, /function restoreDailyActivity\(exercise\)/)
  assert.match(html, /localStorage\.setItem\(activityCacheKey\(exercise\)/)
  assert.match(html, /restoreDailyActivity\("pushup"\);[\s\S]*?restoreDailyActivity\("squat"\);/)
  assert.match(html, /await Promise\.all\(\[loadProfile\(\), loadDailyActivity\(\)\]\);/)
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
  assert.match(html, /#mBattle\{[^}]*min-height:56px;[^}]*padding:10px 16px/s)
  assert.match(html, /#menu\{[^}]*padding-bottom:calc\(env\(safe-area-inset-bottom\) \+ 172px\)/)
})

test('activity switch нягт боловч mobile touch target-аа хадгална', () => {
  assert.match(html, /\.activitySwitch button\{min-height:44px;padding:8px 12px/)
})

test('Push Up ба Суулт доод navigation-аас бэлтгэл дэлгэц нээнэ', () => {
  assert.match(html, /\$\("navPush"\)\.onclick = \(\) => openSolo\("pushup"\)/)
  assert.match(html, /\$\("navSquat"\)\.onclick = \(\) => openSolo\("squat"\)/)
})
