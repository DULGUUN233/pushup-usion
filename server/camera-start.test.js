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
    const beginAiLoading = () => events.push("loading-start");
    const endAiLoading = () => events.push("loading-end");
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
  assert.deepEqual(result.started, ['audio', 'loading-start', 'camera', 'model'])
  assert.deepEqual(result.afterCamera, ['audio', 'loading-start', 'camera', 'model', 'preview'])
  assert.equal(result.running, true)
  assert.deepEqual(result.events.slice(-2), ['reset', 'loop'])
  assert.equal(result.events.filter(event => event === 'loading-end').length, 1)
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
    const setModelProgress = () => {};
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

test('AI эх үүсвэрүүдтэй урьдчилан холбогдож, critical data-ийн дараа model-оо халаана', () => {
  assert.match(html, /<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net" crossorigin>/)
  assert.match(html, /<link rel="preconnect" href="https:\/\/storage\.googleapis\.com" crossorigin>/)
  const usionAt = html.indexOf('launchCfg = await usionInit();')
  const criticalAt = html.indexOf('const startupReady = Promise.allSettled(startupTasks.map')
  const readyAt = html.indexOf('await Promise.race([', criticalAt)
  const menuAt = html.indexOf('show("menu");', readyAt)
  const normalWarmupAt = html.indexOf('setTimeout(scheduleModelWarmup, 600);')
  assert.ok(usionAt > 0 && usionAt < criticalAt && criticalAt < readyAt && readyAt < menuAt && menuAt < normalWarmupAt)
  assert.match(html, /const startupTasks = \[loadProfile\(\), loadDailyActivity\(\)\];/)
  assert.match(html, /if\(CHALLENGES_ENABLED\) startupTasks\.push\(loadChallenges\(\)\);/)
  assert.match(html, /if\(!directInvite\) startupTasks\.push\(fetchLeagueHub\(\)\);/)
  assert.match(html, /new Promise\(resolve => setTimeout\(resolve, 10_000\)\)/)
  assert.match(html, /if\(directInvite\)\{[\s\S]*?scheduleModelWarmup\(\);/)
})

test('cold start loading төлөв нь хүртээмжтэй, богино warm start дээр анивчихгүй', () => {
  assert.match(html, /id="boot" class="screen" role="status" aria-live="polite" aria-atomic="true"/)
  assert.match(html, /Үндсэн мэдээллүүдийг ачаалж байна\./)
  assert.match(html, /id="aiLoading" class="hidden" role="status" aria-live="polite" aria-atomic="true"/)
  assert.equal((html.match(/data-model-progress role="progressbar"/g) ?? []).length, 2)
  assert.match(html, /aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"/)
  assert.match(html, /modelProgressBar[\s\S]*?transition:width \.18s ease-out/)
  assert.match(html, /function setBootProgress\(value\)[\s\S]*?#boot \[data-model-progress\]/)
  assert.match(html, /setBootProgress\(8 \+ startupDone \/ startupTasks\.length \* 92\)/)
  assert.match(html, /setBootProgress\(100\);/)
  assert.match(html, /aiLoadingTimer = setTimeout\([\s\S]*?\}, 300\)/)
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)[\s\S]*?\.aiLoadingRing\{animation:none/)
})

test('Heavy model-ийн stream бодит byte-аар progress тооцно', async () => {
  const run = new Function(`
    const updates = [];
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4])];
    const fetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: name => name === "content-length" ? "4" : null },
      body: new ReadableStream({
        start(controller){
          for(const chunk of chunks) controller.enqueue(chunk);
          controller.close();
        }
      })
    });
    ${sourceOf('modelAssetWithProgress')}
    return modelAssetWithProgress("model.task", value => updates.push(Math.round(value)))
      .then(async reader => {
        let bytes = 0;
        while(true){
          const { done, value } = await reader.read();
          if(done) break;
          bytes += value.byteLength;
        }
        return { updates, bytes };
      });
  `)

  const result = await run()
  assert.equal(result.bytes, 4)
  assert.deepEqual(result.updates, [5, 48, 90, 92])
})

test('model эсвэл camera алдаа өгвөл нээгдсэн stream-ийг хаана', async () => {
  const run = new Function(`
    let stopped = 0;
    const navigator = { mediaDevices: { getUserMedia(){} } };
    const ac = () => {};
    const openCamera = async () => {};
    const ensureExerciseModel = async () => { throw new Error("model"); };
    const stopCamera = () => stopped++;
    const beginAiLoading = () => {};
    const endAiLoading = () => {};
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

test('bottom navigation camera preview бэлэн болтол харагдаж, дараа нь нуугдана', () => {
  assert.match(html, /const navByScreen = \{ menu:"navHome", pushChoice:"navPush", hall:"navBattle", board:"navBoard" \}/)
  assert.match(html, /function openSolo\([\s\S]*?show\("play"\);[\s\S]*?setMainNavActive\(kind === "squat" \? "navSquat" : "navPush"\);/)
  assert.match(html, /async function startSolo\([\s\S]*?await startEngine\(\(\) => \{[\s\S]*?setMainNavActive\(null\);/)
  assert.match(html, /async function armForBattle\([\s\S]*?show\("play"\);\s*setMainNavActive\("navBattle"\);[\s\S]*?await startEngine\(\(\) => \{\s*setMainNavActive\(null\);/)
  assert.match(html, /function prepareMainNavDestination\(\)\{\s*if\(mode === "battle"\) leaveBattle\(\);\s*else stopCamera\(\);\s*\}/)
  assert.match(html, /body\.mainNavVisible #pushChoice\{[^}]*padding-bottom:/)
  assert.match(html, /body\.mainNavVisible #hall\{[^}]*padding-bottom:/)
  assert.match(html, /body\.mainNavVisible #start\{[^}]*padding-bottom:/)
})
