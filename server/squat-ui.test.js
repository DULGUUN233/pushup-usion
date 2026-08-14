import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

function sourceOf(name) {
  const match = html.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`))
  assert.ok(match, `${name} source олдсонгүй`)
  return match[0]
}

test('battle squat батлагдахад сервер рүү rep илгээнэ', () => {
  const fn = sourceOf('countSquatRep')
  const run = new Function('mode', `
    let count = 0, bestDepth = null;
    const squatMinKnee = 92, squatMinHip = 84, squatMaxDepthDelta = 0.08;
    let sent = 0, messages = 0;
    const sendRep = () => sent++;
    const sndRep = () => {};
    const setMsg = () => messages++;
    const resetPoseFeedback = () => {};
    const resetSquatCycle = () => {};
    const navigator = {};
    const node = { textContent: "", offsetWidth: 1,
      classList: { add(){}, remove(){} } };
    const $ = () => node;
    ${fn}
    countSquatRep();
    return { count, sent, messages };
  `)

  assert.deepEqual(run('battle'), { count: 1, sent: 1, messages: 0 })
  assert.deepEqual(run('solo'), { count: 1, sent: 0, messages: 1 })
})

test('толгой захад байсан ч squat-ын мөр-шагай бүтэн бол cycle хүчинтэй', () => {
  const margin = html.match(/const SQUAT_FRAME_MARGIN = [^;]+;/)?.[0]
  assert.ok(margin, 'SQUAT_FRAME_MARGIN source олдсонгүй')
  const check = new Function(`${margin}\n${sourceOf('squatPositionCheck')}\nreturn squatPositionCheck`)()

  assert.equal(check([{ y: -0.2, visibility: 1 }], {
    shoulderY: 0.05,
    ankleY: 0.99,
  }), null)
  assert.notEqual(check([], {
    shoulderY: 0.05,
    ankleY: 1.03,
  }), null)
  assert.notEqual(check([], {
    shoulderY: -0.03,
    ankleY: 0.95,
  }), null)
})

test('standing → depth → standing бүтэн cycle battle-д яг нэг rep болно', () => {
  const run = new Function(`
    const SQUAT_LOCKOUT_KNEE = 160, SQUAT_LOCKOUT_HIP = 150;
    const SQUAT_DEPTH_KNEE = 115, SQUAT_DEPTH_Y_TOLERANCE = 0.01;
    const SQUAT_DESCENT_KNEE = 145, SQUAT_MIN_REP_MS = 450;
    const SQUAT_CONFIRM_FRAMES = 3, BAD_FRAMES = 5;
    let phase = "up", squatReady = false, squatDepthFrames = 0, squatStandFrames = 0;
    let squatMinKnee = 180, squatMinHip = 180, squatMaxDepthDelta = -1;
    let repStart = 0, smooth = null, badFrames = 0, bestDepth = null, count = 0;
    let midDrops = 0, modelVariant = "full", mode = "battle", sent = 0;
    let metric;
    const squatMetrics = () => metric;
    const squatPositionCheck = () => null;
    const sendRep = () => sent++;
    const sndRep = () => {};
    const setMsg = () => {};
    const setPoseMsg = setMsg;
    const resetPoseFeedback = () => {};
    const navigator = {};
    const node = { textContent: "", offsetWidth: 1, style: {},
      classList: { add(){}, remove(){}, toggle(){} } };
    const $ = () => node;
    ${sourceOf('resetSquatCycle')}
    ${sourceOf('countSquatRep')}
    ${sourceOf('processSquatFrame')}
    const frame = (knee, hip, hipY, kneeY, now) => {
      metric = { knee, knee3d:knee, hip, hipY, kneeY, vis:0.95 };
      processSquatFrame([], [], 0.5625, now);
    };
    frame(170,160,.45,.65,0);
    frame(170,160,.45,.65,100);
    frame(170,160,.45,.65,200);
    frame(140,125,.55,.65,300);
    frame(100,85,.66,.65,400);
    frame(100,85,.66,.65,500);
    frame(100,85,.66,.65,600);
    frame(170,160,.45,.65,700);
    frame(170,160,.45,.65,800);
    frame(170,160,.45,.65,900);
    frame(170,160,.45,.65,1000);
    return { count, sent, phase };
  `)

  assert.deepEqual(run(), { count: 1, sent: 1, phase: 'up' })
})
