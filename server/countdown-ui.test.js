import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

function sourceOf(name) {
  const match = html.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`))
  assert.ok(match, `${name} source олдсонгүй`)
  return match[0]
}

test('battle countdown камерын төвд том timer байдлаар харагдана', () => {
  assert.match(html, /id="battleCountdown"[^>]*role="timer"/)
  assert.match(html, /#battleCountdown\{[^}]*inset:0[^}]*display:grid[^}]*place-items:center/s)
  assert.match(html, /#battleCountdownNum\{[^}]*font-size:clamp\(96px,32vw,168px\)/s)
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)[^{]*\{[^}]*#battleCountdownNum\.tick\{animation:none\}/s)
})

test('тоолох үед score bar нуугдаж, дуусахад countdown цэвэрлэгдэнэ', () => {
  const run = new Function(`
    const classes = initial => {
      const values = new Set(initial);
      return {
        add(value){ values.add(value); },
        remove(value){ values.delete(value); },
        contains(value){ return values.has(value); },
      };
    };
    const nodes = {
      battleCountdown: { classList:classes(["hidden"]) },
      battleCountdownNum: { textContent:"", offsetWidth:1, classList:classes([]) },
      duelBar: { classList:classes([]) },
    };
    const $ = id => nodes[id];
    let battleCountdownSecond = null;
    ${sourceOf('resetBattleCountdown')}
    ${sourceOf('showBattleCountdown')}
    showBattleCountdown(10);
    const active = {
      number:nodes.battleCountdownNum.textContent,
      overlayHidden:nodes.battleCountdown.classList.contains("hidden"),
      barHidden:nodes.duelBar.classList.contains("hidden"),
    };
    resetBattleCountdown();
    return {
      active,
      resetHidden:nodes.battleCountdown.classList.contains("hidden"),
      resetSecond:battleCountdownSecond,
    };
  `)

  assert.deepEqual(run(), {
    active: { number:10, overlayHidden:false, barHidden:true },
    resetHidden:true,
    resetSecond:null,
  })
})

test('server-ийн startsAt хүртэл том countdown, дараа нь үндсэн clock гарна', () => {
  assert.match(
    html,
    /if\(now < begin\)\{[\s\S]*?showBattleCountdown\(left\);[\s\S]*?\} else \{[\s\S]*?resetBattleCountdown\(\);[\s\S]*?duelBar[\s\S]*?classList\.remove\("hidden"\)/,
  )
})
