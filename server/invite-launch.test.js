import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('урилгын launch дээр menu flash хийхгүй', () => {
  assert.match(html, /<section id="boot" class="screen"[^>]*>/)
  assert.match(html, /<section id="menu" class="screen hidden">/)
})

test('урилгын waiting room profile API-г хүлээлгүй шууд харагдана', () => {
  const init = html.indexOf('launchCfg = await usionInit();')
  const branch = html.indexOf('const directInvite = guestLaunch();', init)
  const hall = html.indexOf('show("hall");', branch)
  const profile = html.indexOf('await Promise.all([loadProfile(), loadDailyActivity(), loadChallenges()]);', branch)

  assert.ok(init >= 0 && branch > init, 'invite startup branch олдсонгүй')
  assert.ok(hall > branch && hall < profile, 'waiting room profile ачааллаас өмнө харагдах ёстой')
})
