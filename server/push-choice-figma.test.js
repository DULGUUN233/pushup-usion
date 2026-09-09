import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const reference = await readFile(new URL('../design/figma/push-choice.reference.txt', import.meta.url), 'utf8')
const styles = html.slice(html.indexOf('  /* Push Up chooser 450:10239'), html.indexOf('</style>'))

test('Push Up chooser follows the 430px reference without changing the Squat layout', () => {
  assert.match(reference, /width: 430px;\s*height: 932px;/)
  assert.match(styles, /#pushChoice\[data-exercise="pushup"\]\{--choice-unit:calc\(min\(100vw,430px\) \/ 430\)/)
  assert.match(styles, /159\.21 \* var\(--choice-unit\)/)
  assert.match(styles, /min-height:calc\(85\.32 \* var\(--choice-unit\)\)/)
  assert.match(styles, /min-height:calc\(93 \* var\(--choice-unit\)\)/)
  assert.match(styles, /grid-template-columns:calc\(52\.32 \* var\(--choice-unit\)\) minmax\(0,1fr\) calc\(24 \* var\(--choice-unit\)\)/)
  assert.match(styles, /font-family:"Benzin",sans-serif;font-size:calc\(36 \* var\(--choice-unit\)\);font-weight:400/)
  assert.match(styles, /radial-gradient\(97\.01% 97\.01% at 50% 96\.61%,rgba\(249,115,22,\.2\) 0%,rgba\(255,255,255,0\) 100%\)/)
  assert.match(styles, /radial-gradient\(65\.39% 65\.39% at 50% 101\.11%,rgba\(255,255,255,\.2\) 0%,rgba\(255,255,255,0\) 100%\),#181c22/)
})

test('Chooser reuses exact SVG bounds and the scaled Home navigation', () => {
  assert.match(styles, /width:calc\(38\.3629 \* var\(--choice-unit\)\);height:calc\(20\.3064 \* var\(--choice-unit\)\)/)
  assert.match(styles, /width:calc\(34\.6403 \* var\(--choice-unit\)\);height:calc\(37\.2833 \* var\(--choice-unit\)\)/)
  assert.match(html, /#mainNav:has\(~#pushChoice\[data-exercise="pushup"\]:not\(\.hidden\),~:where\(#play:not\(\.hidden\)\) #start\.squatPrep:not\(\.hidden\)\)\{--home-unit:/)
  assert.match(styles, /background:#f8fafc;mask-image:url\('\.\/assets\/figma\/nav-push\.svg'\)/)
})

test('Choosing Push Up or Squat keeps the existing mode actions and titles', () => {
  const nodes = new Map()
  const get = id => {if(!nodes.has(id)) nodes.set(id,{dataset:{},textContent:''});return nodes.get(id)}
  const shown=[]
  let cameraStops=0
  const context={$:get,t:key=>key==='pushChoiceTitle'?'Push Up':key,show:id=>shown.push(id),stopCamera:()=>cameraStops++}
  const source=html.slice(html.indexOf('function openPushChoice('),html.indexOf('function openSolo('))
  runInNewContext('let choiceExercise,soloVariant;'+source+'openPushChoice("pushup");',context)
  assert.equal(get('pushChoice').dataset.exercise,'pushup')
  assert.equal(get('pushChoiceTitleMain').textContent,'Push ')
  assert.equal(get('pushChoiceTitleAccent').textContent,'Up')
  runInNewContext('openPushChoice("squat");',context)
  assert.equal(get('pushChoice').dataset.exercise,'squat')
  assert.equal(get('pushChoiceTitleAccent').textContent,'')
  assert.equal(get('pushNormalDescription').textContent,'squatModeNormalDescription')
  assert.deepEqual(shown,['pushChoice','pushChoice'])
  assert.equal(cameraStops,2)
  assert.match(html, /\$\("pushNormal"\)\.onclick = \(\) => openSolo\(choiceExercise, "normal"\)/)
  assert.match(html, /\$\("pushGame"\)\.onclick = \(\) => openSolo\(choiceExercise, "game"\)/)
})
