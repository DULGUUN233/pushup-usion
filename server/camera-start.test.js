import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

function sourceOf(name) {
  const match = html.match(new RegExp(`async function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`))
  assert.ok(match, `${name} source олдсонгүй`)
  return match[0]
}

test('camera permission хүсэлт model ачааллаас өмнө, зэрэг эхэлнэ', async () => {
  const run = new Function(`
    const events = [];
    let resolveCamera, resolveModel;
    const cameraReady = new Promise(resolve => { resolveCamera = resolve; });
    const modelReady = new Promise(resolve => { resolveModel = resolve; });
    const navigator = { mediaDevices: { getUserMedia(){} } };
    const ac = () => events.push("audio");
    const openCamera = () => { events.push("camera"); return cameraReady; };
    const ensureExerciseModel = () => { events.push("model"); return modelReady; };
    const stopCamera = () => events.push("stop");
    const reset = () => events.push("reset");
    const loop = () => events.push("loop");
    let fpsEma = 1, lastFrame = 1, lowFpsSince = 1, running = false;
    ${sourceOf('startEngine')}
    const task = startEngine();
    const started = [...events];
    resolveCamera();
    resolveModel();
    return task.then(() => ({ started, running, events }));
  `)

  const result = await run()
  assert.deepEqual(result.started, ['audio', 'camera', 'model'])
  assert.equal(result.running, true)
  assert.deepEqual(result.events.slice(-2), ['reset', 'loop'])
})

test('model эсвэл camera алдаа өгвөл нээгдсэн stream-ийг хаана', async () => {
  const run = new Function(`
    let stopped = 0;
    const navigator = { mediaDevices: { getUserMedia(){} } };
    const ac = () => {};
    const openCamera = async () => {};
    const ensureExerciseModel = async () => { throw new Error("model"); };
    const stopCamera = () => stopped++;
    const reset = () => {};
    const loop = () => {};
    let fpsEma = 0, lastFrame = 0, lowFpsSince = 0, running = false;
    ${sourceOf('startEngine')}
    return startEngine().then(
      () => ({ stopped, rejected:false }),
      () => ({ stopped, rejected:true }),
    );
  `)

  assert.deepEqual(await run(), { stopped: 1, rejected: true })
})
