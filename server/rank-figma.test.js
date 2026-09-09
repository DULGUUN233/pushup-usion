import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const reference = await readFile(new URL('../design/figma/rank.reference.txt', import.meta.url), 'utf8')
const styles = html.slice(html.indexOf('  /* Rank — Figma'), html.indexOf('  .boardLoading{'))

test('Rank uses the supplied 430px geometry and the exported Union background', async () => {
  assert.match(reference, /width: 430px;\s*height: 932px;/)
  for (const value of ['19.59', '52.73', '60.42', '179.26', '74.33', '61.57', '292.84', '368', '65', '16.5', '12', '220.91']) {
    assert.ok(styles.includes(`${value} * var(--rank-unit)`), value)
  }
  assert.match(styles, /rank-union\.svg/)
  const union = await readFile(new URL('../assets/figma/rank-union.svg', import.meta.url), 'utf8')
  assert.match(union, /viewBox="0 0 430 626"/)
  for (const color of ['#20252D', '#0F1115', '#0B0D10']) assert.ok(union.includes(color))
  assert.doesNotMatch(styles, /grayscale\(/)
})

test('Rank detail shares scaled navigation and leaves scroll space beyond its fade', () => {
  assert.ok(html.includes('#board:not(.hidden):has(#boardDetail:not(.hidden))~#mainNav'))
  assert.match(html, /#board:has\(#boardDetail:not\(\.hidden\)\)\{[^}]*240 \* var\(--rank-unit\)/)
  assert.match(html, /#navBoard::before\{background:#f8fafc;mask-image:url\('\.\/assets\/figma\/nav-rank\.svg'\)/)
})

test('Podium and list preserve live portrait URLs, names, ranks and scores', () => {
  const element = tag => ({tag, children:[], className:'', textContent:'', append(...items){this.children.push(...items)}, appendChild(item){this.children.push(item)}})
  const podium = element('div')
  const context = {document:{createElement:element}, $:()=>podium, profile:{userId:'mine'}, boardNumber:new Intl.NumberFormat('en-US'), boardUnit:()=>'REP'}
  const avatarSource = html.slice(html.indexOf('function makeRankAvatar('), html.indexOf('function fillLeagueCard('))
  const rankSource = html.slice(html.indexOf('function renderPodium('), html.indexOf('async function loadBoard('))
  runInNewContext(avatarSource + rankSource, context)
  const players = [1,2,3,4].map(rank=>({rank,userId:rank===4?'mine':`user-${rank}`,name:`Player ${rank}`,score:1234-rank,avatar:`https://example.test/portrait-${rank}.jpg`}))
  context.renderPodium(players)
  assert.equal(podium.children.length,3)
  for (const [i,place] of podium.children.entries()) {
    assert.equal(place.children[0].children[0].src,players[i].avatar)
    assert.equal(place.children[0].children[1].textContent,players[i].rank)
    assert.equal(place.children[1].textContent,players[i].name)
  }
  const row = context.renderRankRow(players[3])
  assert.equal(row.className,'row me')
  assert.equal(row.children[0].textContent,4)
  assert.equal(row.children[1].src,players[3].avatar)
  assert.equal(row.children[2].textContent,'Player 4')
  assert.equal(row.children[3].children[0].textContent,'1,230')
  assert.equal(row.children[3].children[1].textContent,'REP')
  assert.equal(context.makeRankAvatar({name:'Bold'}).textContent,'B')
})
