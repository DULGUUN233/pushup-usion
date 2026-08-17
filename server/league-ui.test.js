import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('inline app JavaScript syntax хүчинтэй', () => {
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]
  assert.ok(script)
  const withoutImport = script.replace(/import\s*\{[\s\S]*?\}\s*from\s*"[^"]+";/, '')
  assert.doesNotThrow(() => new Function(`return (async () => {${withoutImport}})`))
})

test('лиг hub нь үүсгэх, кодоор нэгдэх хоёр урсгалтай', () => {
  assert.match(html, /id="createLeagueForm" class="leagueForm"/)
  assert.match(html, /id="joinLeagueForm" class="leagueForm"/)
  assert.match(html, /api\("\/leagues"[^]*method:"POST"/)
  assert.match(html, /api\("\/leagues\/join"[^]*method:"POST"/)
})

test('hub-ийн лигийн карт rank-аа зүүн, мэдээллээ голд, chevron-оо баруун харуулна', () => {
  assert.match(html, /className = "leagueRankBlock"/)
  assert.match(html, /button\.append\(rank, meta, chevron\)/)
  assert.match(html, /class="leagueTitleRow"><h3>Лигүүд<\/h3>/)
})

test('лиг UI reduced motion ба keyboard focus-ийг дэмжинэ', () => {
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)/)
  assert.match(html, /#board button:focus-visible/)
})

test('лиг дотор гурван төрлийн байрлал байна', () => {
  assert.match(html, /id="boardPush"[^>]*>Push-up/)
  assert.match(html, /id="boardSquat"[^>]*>Squat/)
  assert.match(html, /id="boardBattle"[^>]*>Battle ELO/)
})

test('өөрийн байр ба дараагийн байрны зөрүү харагдана', () => {
  assert.match(html, /id="myRankCard"/)
  assert.match(html, /Дараагийн байрыг давахад/)
})
