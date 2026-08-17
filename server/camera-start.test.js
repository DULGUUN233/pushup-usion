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
    const task = startEngine(() => events.push("preview"));
    const started = [...events];
    resolveCamera();
    return Promise.resolve()
      .then(() => Promise.resolve())
      .then(() => {
        const afterCamera = [...events];
        resolveModel();
        return task.then(() => ({ started, afterCamera, running, events }));
      });
  `)

  const result = await run()
  assert.deepEqual(result.started, ['audio', 'camera', 'model'])
  assert.deepEqual(result.afterCamera, ['audio', 'camera', 'model', 'preview'])
  assert.equal(result.running, true)
  assert.deepEqual(result.events.slice(-2), ['reset', 'loop'])
})

test('Heavy model урьдчилан болон camera start-аас зэрэг хүсэгдсэн ч нэг л удаа ачаална', async () => {
  const run = new Function(`
    let created = 0;
    let resolveModel;
    const HEAVY_MODEL = "heavy";
    const createLandmarker = () => {
      created++;
      return new Promise(resolve => { resolveModel = resolve; });
    };
    let landmarker = null, modelLoadPromise = null, modelVariant = "heavy";
    ${sourceOf('loadInitialPoseModel')}
    const first = loadInitialPoseModel();
    const second = loadInitialPoseModel();
    resolveModel({ id: 1 });
    return Promise.all([first, second]).then(models => ({ created, models, landmarker }));
  `)

  const result = await run()
  assert.equal(result.created, 1)
  assert.strictEqual(result.models[0], result.models[1])
  assert.strictEqual(result.models[0], result.landmarker)
})

test('AI эх үүсвэрүүдтэй урьдчилан холбогдож, menu эсвэл hall дээр model-оо халаана', () => {
  assert.match(html, /<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net" crossorigin>/)
  assert.match(html, /<link rel="preconnect" href="https:\/\/storage\.googleapis\.com" crossorigin>/)
  const warmupAt = html.indexOf('scheduleModelWarmup();')
  const usionAt = html.indexOf('launchCfg = await usionInit();')
  const profileAt = html.indexOf('await loadProfile();')
  assert.ok(warmupAt > 0 && warmupAt < usionAt && usionAt < profileAt)
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
