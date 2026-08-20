import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('battle waiting room нүүрийн Carbon Ember design token ашиглана', () => {
  assert.match(html, /#hall\{--hall-bg:#0b0d10;--hall-bg-deep:#07080a;--hall-card:#181c22/)
  assert.match(html, /--hall-primary:#f97316;--hall-secondary:#fbbf24/)
  assert.match(html, /#hall\{[^}]*radial-gradient\(circle at 50% -8%,rgba\(249,115,22,\.18\),transparent 36%\)[^}]*linear-gradient\(180deg,var\(--hall-bg\) 0%,#101116 54%,var\(--hall-bg-deep\) 100%\)/s)
  assert.match(html, /#hallSeats\{[^}]*border-radius:24px;[^}]*background:rgba\(24,28,34,\.78\)/s)
  assert.match(html, /#hallStart,#hallReady\{[^}]*min-height:52px;[^}]*linear-gradient\(135deg,var\(--hall-primary\),var\(--hall-secondary\)\)/s)
})

test('battle төрлийн сонголт sliding pill animation-тай', () => {
  assert.match(html, /class="battleTypePill"/)
  assert.match(html, /\.battleTypePill\{[^}]*transition:transform 250ms cubic-bezier\(\.22,1,\.36,1\)/s)
  assert.match(html, /#battleTypes\[data-active="squat"\] \.battleTypePill\{transform:translateX\(calc\(100% \+ 6px\)\)\}/)
  assert.match(html, /#battleTypes\[data-active="combined"\] \.battleTypePill\{transform:translateX\(calc\(200% \+ 12px\)\)\}/)
  assert.match(html, /\$\("battleTypes"\)\.dataset\.active = battleType/)
})

test('battle room animation хүртээмжтэй, touch target хангалттай', () => {
  assert.match(html, /#hall:not\(\.hidden\) #hallSeats,#hall:not\(\.hidden\) #battleTypes\{animation:hallEnter/)
  assert.match(html, /@keyframes hallEnter\{from\{opacity:0;transform:translateY\(14px\)\}to\{opacity:1;transform:translateY\(0\)\}\}/)
  assert.match(html, /\.battleType\{[^}]*min-height:56px/s)
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?#hallSeats,#battleTypes,\.seat\.on\{animation:none!important\}/)
  assert.match(html, /#hall button:focus-visible\{outline:3px solid var\(--hall-fg\)/)
})
