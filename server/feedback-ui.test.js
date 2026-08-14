import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

function sourceOf(name) {
  const match = html.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`))
  assert.ok(match, `${name} source олдсонгүй`)
  return match[0]
}

test('техникийн алдааг хэрэглэгчид ойлгомжтой, засах алхамтай болгоно', () => {
  const friendlyError = new Function(`${sourceOf('friendlyError')}\nreturn friendlyError`)()

  assert.match(friendlyError({ name:'NotAllowedError' }), /зөвшөөрөл.*Тохиргоо/i)
  assert.match(friendlyError(new Error('HTTP 401')), /дахин нээнэ/i)
  assert.match(friendlyError(new Error('урилга хүчингүй')), /шинэ урилга/i)
  assert.doesNotMatch(friendlyError(new Error('USION_SERVICE_ID тохируулаагүй байна')), /USION|SERVICE_ID/)
})

test('raw error text UI рүү шууд гарахгүй', () => {
  assert.doesNotMatch(html, /err\.textContent = e\.message/)
  assert.doesNotMatch(html, /Камер асаагүй:"? \+ e\.message/)
  assert.doesNotMatch(html, /Тулаан эхэлсэнгүй:"? \+ e\.message/)
  assert.doesNotMatch(html, /Ачаалж чадсангүй:"? \+ e\.message/)
})

test('давтагдсан pose алдаа тогтвортой байсны дараа ганц удаа харагдана', () => {
  const declarations = html.match(/const POSE_NEUTRAL_DELAY_MS[^;]+;[\s\S]*?let posePriority = 0;/)?.[0]
  assert.ok(declarations, 'pose feedback state олдсонгүй')
  const calls = []
  const run = new Function('setMsg', `
    let now = 0;
    const performance = { now:() => now };
    ${declarations}
    ${sourceOf('setPoseMsg')}
    const emit = (time, text, color) => { now=time; setPoseMsg(text, color); };
    emit(0, "Хүн олдсонгүй", "var(--dim)");
    emit(200, "Хүн олдсонгүй", "var(--dim)");
    emit(500, "Хүн олдсонгүй", "var(--dim)");
    emit(550, "Хүн олдсонгүй", "var(--dim)");
  `)
  run((...args) => calls.push(args))
  assert.deepEqual(calls, [['Хүн олдсонгүй', 'var(--dim)']])
})

test('dynamic status message-үүд accessibility role-той', () => {
  for(const id of ['note', 'hallHint', 'msg', 'err']){
    assert.match(html, new RegExp(`id="${id}"[^>]*role="(?:status|alert)"`))
  }
})

test('камерын булангийн хөгжүүлэлтийн хэмжүүрүүд хэрэглэгчид харагдахгүй', () => {
  assert.match(html, /<div id="top" class="hidden" aria-hidden="true">/)
})
