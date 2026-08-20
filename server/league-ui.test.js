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

test('Нүүр, Push Up, Battle, Суулт, Жагсаалт гэсэн таван item доод navigation-д байна', () => {
  assert.match(html, /<nav id="mainNav"[^>]*aria-label="Үндсэн цэс"/)
  assert.match(html, /id="navHome"[^>]*aria-label="Нүүр"/)
  assert.match(html, /id="navPush"[^>]*aria-label="Push Up"/)
  assert.match(html, /id="navBattle"[^>]*aria-label="Battle Friend"/)
  assert.match(html, /id="navSquat"[^>]*aria-label="Суулт"/)
  assert.match(html, /id="navBoard"[^>]*aria-label="Жагсаалт"/)
  assert.match(html, /grid-template-columns:repeat\(5,1fr\)/)
  assert.match(html, /const navByScreen = \{ menu:"navHome", pushChoice:"navPush", hall:"navBattle", board:"navBoard" \}/)
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

test('лиг дотор давхар back товчгүй, Usion back лигийн жагсаалт руу буцна', () => {
  assert.doesNotMatch(html, /id="detailBack"/)
  assert.match(html, /if\(id === "board"\) return void u\.claimBackButton\(\(\) => \{[^]*showBoardHub\(true\)/)
  assert.match(html, /function openLeagueBoard\(code, name\)\{[^]*setBack\("board"\)/)
})

test('leaderboard hub mobile-д compact Carbon Ember design ашиглана', () => {
  assert.match(html, /#board\{--board-bg:#0b0d10;--board-surface:#171b21;/)
  assert.match(html, /\.boardHead h2\{[^}]*font-size:28px/)
  assert.match(html, /\.leagueForm\{padding:14px;margin:0 0 10px/)
  assert.match(html, /\.leagueForm input\{[^}]*height:44px/)
  assert.match(html, /\.leagueCard\{[^}]*min-height:78px/)
  assert.match(html, /background:linear-gradient\(135deg,var\(--board-primary\),var\(--board-secondary\)\)/)
})

test('leaderboard hub animation нь transform, opacity ашиглаж reduced motion-ийг хүндэтгэнэ', () => {
  assert.match(html, /@keyframes boardRise\{from\{opacity:0;transform:translateY\(10px\)\}/)
  assert.match(html, /@keyframes leagueCardIn\{from\{opacity:0;transform:translateY\(8px\) scale\(\.985\)\}/)
  assert.match(html, /\.leagueCard,\.leagueForm,\.leagueTitleRow,\.boardHead[^}]*\{animation:none!important;transition:none!important\}/)
})

test('leaderboard detail нь sliding metric pill болон compact мөрүүдтэй', () => {
  assert.match(html, /id="boardTabs" data-active="pushup"/)
  assert.match(html, /class="boardTabsPill" aria-hidden="true"/)
  assert.match(html, /#boardTabs\[data-active="squat"\] \.boardTabsPill/)
  assert.match(html, /\$\("boardTabs"\)\.dataset\.active = metric/)
  assert.match(html, /#podium\{[^}]*min-height:154px/)
  assert.match(html, /\.row\{min-height:54px/)
})

test('leaderboard metric tab нь давхар card биш flat underline байна', () => {
  assert.match(html, /#boardTabs\{[^}]*border:0;border-bottom:1px solid var\(--board-border\);border-radius:0;background:transparent/)
  assert.match(html, /\.boardTabsPill\{[^}]*bottom:-1px;width:33\.333%;height:3px/)
  assert.match(html, /#boardTabs button\.active\{background:transparent;color:var\(--board-primary\)\}/)
  assert.match(html, /#boardTabs\[data-active="battle"\] \.boardTabsPill\{transform:translateX\(200%\)\}/)
})

test('leaderboard detail podium ба мөрүүд staggered animation-тай', () => {
  assert.match(html, /@keyframes podiumPop\{from\{opacity:0;transform:translateY\(10px\) scale\(\.94\)\}/)
  assert.match(html, /@keyframes rankRowIn\{from\{opacity:0;transform:translateY\(7px\)\}/)
  assert.match(html, /\.podiumPlace\.second\{animation-delay:35ms\}/)
  assert.match(html, /\.row:nth-child\(5\)\{animation-delay:100ms\}/)
  assert.match(html, /\.detailTop,#boardTabs,\.podiumPlace,\.row\{animation:none!important;transition:none!important\}/)
})
