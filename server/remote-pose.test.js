import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('өрсөлдөгчийн видео overlay canvas-гүй', () => {
  assert.match(html, /<video id="oppVid"[^>]*><\/video>/)
  assert.doesNotMatch(html, /oppCanvas/)
})

test('өрсөлдөгчийн pose цэг, зураасыг дамжуулахгүй', () => {
  assert.doesNotMatch(html, /createDataChannel\("pose"/)
  assert.doesNotMatch(html, /function sendPose\(/)
  assert.doesNotMatch(html, /function renderOpponentPose\(/)
})
