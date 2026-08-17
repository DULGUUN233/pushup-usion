import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('default болон custom challenge UI байна', () => {
  assert.match(html, /id="challengeTemplates"/)
  assert.match(html, /id="challengeCustomToggle"[^>]*>Өөрөө үүсгэх/)
  assert.match(html, /id="challengeExercise"/)
  assert.match(html, /<option value="pushup">Push Up<\/option><option value="squat">Суулт<\/option><option value="combined">Хосолсон<\/option>/)
  assert.match(html, /id="challengeDailyTarget"[^>]*min="1" max="1000"/)
  assert.match(html, /id="challengeDays"[^>]*min="1" max="365"/)
})

test('challenge API байна, active card дээр илүү meta мөр харагдахгүй', () => {
  assert.match(html, /api\("\/challenges"\)/)
  assert.match(html, /api\("\/challenges\/start"/)
  assert.match(html, /api\("\/challenges\/current", \{ method:"DELETE" \}\)/)
  assert.doesNotMatch(html, /id="activeChallengeMeta"/)
  assert.doesNotMatch(html, /Нэг өдөр тасарвал дуусна/)
})

test('active challenge үед бусад challenge харагдаж, дэлгэц scroll хэвээр байна', () => {
  assert.match(html, /const challengeRunning = active\?\.status === "active"/)
  assert.match(html, /templates\.classList\.remove\("hidden"\)/)
  assert.match(html, /customToggle\.disabled = challengeRunning/)
  assert.match(html, /button\.disabled = challengeRunning/)
  assert.match(html, /#menu\{display:flex;flex-direction:column;gap:16px;max-width:460px;margin:0 auto;\s*padding-bottom:/)
})

test('богино challenge хоногийн цэг, урт challenge progress bar харуулна', () => {
  assert.match(html, /const usesDayDots = Number\.isInteger\(active\.days\) && active\.days > 0 && active\.days <= 14/)
  assert.match(html, /progressBar\.classList\.toggle\("hidden", usesDayDots\)/)
  assert.match(html, /dots\.classList\.toggle\("hidden", !usesDayDots\)/)
})

test('challenge controls mobile touch target-тай', () => {
  assert.match(html, /\.challengeHead button\{min-height:44px/)
  assert.match(html, /\.challengeActions button,\.challengeStart\{width:100%;min-height:44px/)
  assert.match(html, /#mBattle\{[^}]*min-height:52px/)
})

test('challenge layout солигдоход focus болон хуучин scroll үлдэхгүй', () => {
  assert.match(html, /function resetChallengeView\(\)\{\s*document\.activeElement\?\.blur\?\.\(\);\s*requestAnimationFrame\(\(\) => \{ \$\("menu"\)\.scrollTop = 0; \}\);\s*\}/)
  assert.equal((html.match(/resetChallengeView\(\);/g) || []).length, 2)
})
