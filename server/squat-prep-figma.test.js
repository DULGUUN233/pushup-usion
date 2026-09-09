import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const reference = await readFile(new URL('../design/figma/squat-prep.reference.txt', import.meta.url), 'utf8')
const styles = html.slice(html.indexOf('  /* Normal Squat preparation,'), html.indexOf('  #hall,#board'))

test('Normal Squat preparation uses the exported frame dimensions and spacing', () => {
  assert.match(reference, /width: 430px;\s*height: 932px;/)
  assert.match(styles, /96\.82 \* var\(--squat-unit\)/)
  assert.match(styles, /21\.39 \* var\(--squat-unit\)/)
  assert.match(styles, /width:calc\(296\.55 \* var\(--squat-unit\)\);height:calc\(207\.96 \* var\(--squat-unit\)\)/)
  assert.match(styles, /min-width:calc\(163 \* var\(--squat-unit\)\)/)
  assert.match(styles, /min-height:max\(44px,calc\(57 \* var\(--squat-unit\)\)\)/)
  assert.match(styles, /font-family:"Montserrat",sans-serif;font-size:calc\(14 \* var\(--squat-unit\)\);line-height:calc\(17 \* var\(--squat-unit\)\)/)
  assert.match(styles, /#squatPlacementHint\{display:none\}/)
  assert.match(styles, /#start\.squatPrep #squatPlacementHint\{display:block;order:1\}/)
  assert.match(styles, /#start\.squatPrep #startHint\{order:3\}/)
})

test('Squat reuses source artwork and the exact navigation while preparation is visible', async () => {
  const camera = await readFile(new URL('../assets/figma/squat-camera.svg', import.meta.url), 'utf8')
  const guide = await readFile(new URL('../assets/figma/squat-guide.svg', import.meta.url), 'utf8')
  assert.match(camera, /width="24" height="24" viewBox="0 0 24 24"/)
  assert.match(camera, /stroke="#F97316" stroke-width="1.5"/)
  assert.match(guide, /width="296.55" height="207.96"/)
  assert.match(html, /#mainNav:has\(~#play:not\(\.hidden\) #start\.squatPrep:not\(\.hidden\)\)>#navSquat::before\{background:#f8fafc/)
})

test('Normal Squat alone shows the new prep; Flappy and Push Up keep their instructions', () => {
  const nodes = new Map()
  const get = id => {
    if(!nodes.has(id)){
      const classes = new Set()
      nodes.set(id,{dataset:{},textContent:'',innerHTML:'',classList:{
        add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name),
        toggle:(name,on)=>on?classes.add(name):classes.delete(name),
      }})
    }
    return nodes.get(id)
  }
  const shown=[], nav=[]
  const context={$:get,t:key=>key,stopPushGame:()=>{},resetBattleCountdown:()=>{},show:id=>shown.push(id),setMainNavActive:id=>nav.push(id)}
  const source=html.slice(html.indexOf('function openSolo('),html.indexOf('$("activityPush").onclick'))
  runInNewContext('let exercise,soloVariant,mode;'+source,context)
  for(const [kind,variant,title,hint] of [
    ['squat','normal','squatPrepTitle','squatFacingHint'],
    ['squat','game','squatBirdTitle','squatGameStartHint'],
    ['pushup','normal','pushupTitle','pushupStartHint'],
    ['pushup','game','pushupBirdTitle','gameStartHint'],
  ]){
    runInNewContext(`openSolo(${JSON.stringify(kind)},${JSON.stringify(variant)});`,context)
    const squatPrep=kind==='squat' && variant==='normal'
    assert.equal(get('start').classList.contains('squatPrep'),squatPrep)
    assert.equal(get('howtoSquat').classList.contains('hidden'),!squatPrep)
    assert.equal(get('startTitle').textContent,title)
    assert.equal(get('startTitle').dataset.i18n,title)
    assert.equal(get('startHint').innerHTML,hint)
    assert.equal(get('startHint').dataset.i18nHtml,hint)
    assert.equal(get('go').textContent,variant==='game'?'startGame':'turnOnCamera')
    assert.equal(get('go').disabled,false)
    assert.equal(shown.at(-1),'play')
    assert.equal(nav.at(-1),kind==='squat'?'navSquat':'navPush')
  }
  assert.doesNotMatch(source,/startCamera\(|getUserMedia\(/)
  assert.match(html,/\$\("go"\)\.onclick\s*= startSolo;/)
})
