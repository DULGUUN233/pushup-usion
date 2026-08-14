import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('./battle.js', import.meta.url), 'utf8')
const start = source.indexOf('export async function setBattleType')
const end = source.indexOf('\n}\n\n/**', start)
const setBattleTypeSource = source.slice(start, end + 2)

test('battle төрөл солиход найзын өгсөн ready хэвээр үлдэнэ', () => {
  assert.ok(start >= 0 && end > start, 'setBattleType source олдсонгүй')
  assert.doesNotMatch(setBattleTypeSource, /\bready\s*:/)
  assert.match(setBattleTypeSource, /\barmed\s*:/)
})
