import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const worker = await readFile(new URL('../assets/ground-segment-worker.js', import.meta.url), 'utf8')

function sourceOf(name) {
  const match = html.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`))
  assert.ok(match, `${name} source олдсонгүй`)
  return match[0]
}

test('SegFormer floor model үндсэн camera loop-оос тусдаа worker дээр ажиллана', () => {
  assert.match(worker, /@huggingface\/transformers@4\.2\.0/)
  assert.match(worker, /Xenova\/segformer-b0-finetuned-ade-512-512/)
  assert.match(worker, /device:"wasm"/)
  assert.match(worker, /dtype:"q8"/)
  assert.match(worker, /"floor", "rug"/)
  assert.match(html, /new Worker\("\.\/assets\/ground-segment-worker\.js", \{ type:"module" \}\)/)
  assert.match(html, /GROUND_MODEL_FRAME_SIZE = 256/)
})

test('floor mask өвдөгт тулсан болон зайтай байрлалыг ялгана', () => {
  const metric = new Function(`
    const GROUND_VIS_MIN=.5, GROUND_MODEL_MAX_SEARCH_RATIO=1.2;
    ${sourceOf('pushupGroundMaskMetric')}
    return pushupGroundMaskMetric;
  `)()
  const lm = Array.from({ length:33 }, () => ({ x:.5, y:.5, visibility:1 }))
  Object.assign(lm[11], { x:.35, y:.42 })
  Object.assign(lm[12], { x:.65, y:.42 })
  Object.assign(lm[23], { x:.43, y:.58 })
  Object.assign(lm[24], { x:.57, y:.58 })
  Object.assign(lm[25], { x:.43, y:.70 })
  Object.assign(lm[26], { x:.57, y:.70 })

  const width = 64, height = 64
  const contactMask = new Uint8Array(width*height)
  for(let y=46;y<height;y++) contactMask.fill(1, y*width, (y+1)*width)
  assert.ok(metric(lm, 1, contactMask, width, height).ratio < .2,
    'өвдөгний доор mask шууд эхэлбэл хүрсэн')

  const clearMask = new Uint8Array(width*height)
  for(let y=54;y<height;y++) clearMask.fill(1, y*width, (y+1)*width)
  assert.ok(metric(lm, 1, clearMask, width, height).ratio > .7,
    'шал өвдөгнөөс хол байвал өргөгдсөн')

  assert.equal(metric(lm, 1, new Uint8Array(width*height), width, height), null,
    'model шал таниагүй бол буруу таахгүй')
})

test('SegFormer mobile WebView тогтвортой болох хүртэл асаахгүй, бүх горим 2D fallback ашиглана', () => {
  const enabled = new Function('mode', 'soloVariant', 'exercise', `
    ${sourceOf('pushupGroundModelEnabled')}
    return pushupGroundModelEnabled();
  `)
  assert.equal(enabled('solo', 'normal', 'pushup'), false)
  assert.equal(enabled('solo', 'game', 'pushup'), false)
  assert.equal(enabled('battle', 'normal', 'pushup'), false)
  assert.match(html, /function scheduleGroundSegmentation[\s\S]*?if\(!pushupGroundModelEnabled\(\)\)/)
  assert.match(html, /let metric = aiFresh && !aiContradictsClearPose \? aiFresh : fallback;/)
  assert.match(html, /const kneePose = pushupKneePoseMetric\(lm, aspect\)/)
  assert.match(html, /const fallback = pushupGroundMetric\(lm, aspect\)/)
  assert.match(html, /groundModelMetric = metric \? \{ \.\.\.metric, at:pending\.requestedAt \} : null/)
  assert.match(html, /function stopCamera\(\)[\s\S]*?stopGroundWorker\(\)/)
  assert.match(html, /function stopGroundWorker\(\)[\s\S]*?groundWorker\?\.terminate\(\)/)
})
