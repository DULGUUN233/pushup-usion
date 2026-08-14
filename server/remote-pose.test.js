import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('өрсөлдөгчийн видео өөрийн overlay canvas-тай', () => {
  assert.match(html, /<video id="oppVid"[^>]*><\/video>\s*<canvas id="oppCanvas"/)
  assert.match(html, /#play\.duel #oppVid,\s*#play\.duel #oppCanvas\{/)
  assert.match(html, /#play\.duel\.squat-duel #oppVid,\s*#play\.duel\.squat-duel #oppCanvas\{/)
})

test('pose цэгүүд low-latency WebRTC data channel-аар солилцогдоно', () => {
  assert.match(html, /createDataChannel\("pose",\{ ordered:false, maxRetransmits:0 \}\)/)
  assert.match(html, /pc\.ondatachannel = e => bindPoseChannel\(e\.channel\)/)
  assert.match(html, /function sendPose\(lm, now\)/)
  assert.match(html, /poseChannel\.bufferedAmount > 16_384/)
  assert.match(html, /sendPose\(lm, now\);/)
  assert.match(html, /remotePoseTimer = setTimeout\(clearOpponentPose, 500\)/)
})

test('battle дуусахад remote skeleton цэвэрлэгдэнэ', () => {
  assert.match(html, /function stopVideo\(\)[\s\S]*?clearOpponentPose\(\)/)
})
