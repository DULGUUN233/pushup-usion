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
  assert.match(html, /<label class="srOnly" for="leagueName">Лигийн нэр<\/label>/)
  assert.match(html, /<label class="srOnly" for="leagueCode">6 тэмдэгт лигийн код<\/label>/)
  assert.match(html, /api\("\/leagues"[^]*method:"POST"/)
  assert.match(html, /api\("\/leagues\/join"[^]*method:"POST"/)
})

test('hub-ийн лигийн карт rank-аа зүүн, мэдээллээ голд, chevron-оо баруун харуулна', () => {
  assert.match(html, /className = "leagueRankBlock"/)
  assert.match(html, /button\.append\(rank, meta, chevron\)/)
  assert.match(html, /class="leagueTitleRow"><h3>Лигүүд<\/h3>/)
})

test('лигийг нүүрэн дээр урьдчилж ачаалаад нээхэд ижил хүсэлтийг давхардуулахгүй', () => {
  assert.match(html, /let leagueHubData = null;/)
  assert.match(html, /if\(leagueHubPromise\) return leagueHubPromise;/)
  assert.match(html, /startupTasks\.push\(fetchLeagueHub\(\)\);/)
  assert.match(html, /loadLeagueHub\(false\);/)
})

test('лиг UI reduced motion ба keyboard focus-ийг дэмжинэ', () => {
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)/)
  assert.match(html, /#board button:focus-visible/)
})

test('Нүүр, Push Up, Суулт, Жагсаалт гэсэн дөрвөн item доод navigation-д байна', () => {
  assert.match(html, /<nav id="mainNav"[^>]*aria-label="Үндсэн цэс"/)
  assert.match(html, /id="navHome"[^>]*aria-label="Нүүр"/)
  assert.match(html, /id="navPush"[^>]*aria-label="Push Up"/)
  assert.match(html, /id="navSquat"[^>]*aria-label="Суулт"/)
  assert.match(html, /id="navBoard"[^>]*aria-label="Жагсаалт"/)
  assert.match(html, /grid-template-columns:repeat\(4,1fr\)/)
  assert.match(html, /id === "menu" \|\| id === "board"/)
  assert.doesNotMatch(html, /id="mBoard"|id="bBack"/)
})

test('hub дээр давхардсан тайлбар, хоосон лигийн урт message харагдахгүй', () => {
  assert.doesNotMatch(html, /Найзуудтайгаа нэг лигт нэгдэж/)
  assert.doesNotMatch(html, /Одоогоор лиг алга/)
  assert.doesNotMatch(html, /Нээлттэй жагсаалт/)
  assert.doesNotMatch(html, /id="leagueCount"/)
})

test('лиг дотор гурван төрлийн байрлал байна', () => {
  assert.match(html, /id="boardPush"[^>]*>Push-up/)
  assert.match(html, /id="boardSquat"[^>]*>Squat/)
  assert.match(html, /id="boardBattle"[^>]*>Battle ELO/)
})

test('өөрийн байр зөвхөн үндсэн жагсаалтад байвал харагдана', () => {
  assert.doesNotMatch(html, /id="myRankCard"|renderMyRank|mineMain|mineScore/)
  assert.match(html, /for\(const player of data\.players\.slice\(3\)\) rows\.appendChild\(renderRankRow\(player\)\)/)
})

test('leaderboard top-3 нь титэм, medal badge-тай бөгөөд platform шатгүй', () => {
  assert.match(html, /classList\.add\("podiumCrown"\)/)
  assert.match(html, /className = "podiumBadge"/)
  assert.doesNotMatch(html, /podiumStep/)
})

test('дөрөвдүгээр байрнаас эхлэх row rank-аа тэмдэггүй цэвэр тоогоор харуулна', () => {
  assert.match(html, /pos\.textContent = player\.rank/)
  assert.doesNotMatch(html, /pos\.textContent = `#\$\{player\.rank\}`/)
})
