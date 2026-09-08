import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const reference = await readFile(new URL('../design/figma/home-today.reference.txt', import.meta.url), 'utf8')

test('Home-Today uses the supplied 430 × 932 Figma reference and per-number typography', () => {
  assert.match(reference, /width: 430px;\s*height: 932px;/)
  for(const [selector, family, size, weight] of [
    ['#dailyCount', 'Benzin', '34', '700'],
    ['#dailyGoal', 'Benzin', '16', '400'],
    ['.dailyRingCenter strong', 'Benzin', '36.4307', '700'],
    ['.activityTrendHead strong', 'Montserrat', '24', '700'],
    ['.activityTrendTooltip strong', 'Montserrat', '12', '600'],
  ]){
    const rules = [...html.matchAll(/([^{}]+)\{([^{}]+)\}/g)].filter(match => match[1].trim() === selector)
    const rule = rules.at(-1)?.[2] || ''
    assert.ok(rule.includes(`font-family:"${family}"`), selector)
    assert.ok(rule.includes(`font-size:calc(${size} * var(--home-unit))`), selector)
    assert.ok(rule.includes(`font-weight:${weight}`), selector)
  }
  assert.match(html, /text-box-trim:trim-both;text-box-edge:cap alphabetic/)
})

test('Home-Today retains the exact exported card fill and solid orange ring', () => {
  assert.equal((html.match(/radial-gradient\(65\.39% 65\.39% at 50% 101\.11%,rgba\(255,255,255,\.2\) 0%,rgba\(255,255,255,0\) 100%\),#181c22/g) || []).length, 3)
  assert.match(html, /\.dailyRingValue\{stroke:#f97316;/)
  assert.match(html, /id="dailyRingValue"[^>]*r="47\.5"/)
  assert.match(html, /\.dailyRing circle\{stroke-width:5\}/)
})

function node(){
  let text = ''
  const attributes = {}
  const classes = new Set()
  return {
    attributes, children:[],
    get textContent(){ return text },
    set textContent(value){ text = String(value); this.children = [] },
    setAttribute(key, value){
      attributes[key] = String(value)
      if(key === 'class') for(const name of value.split(' ')) classes.add(name)
    },
    classList:{ toggle(name, enabled){ enabled ? classes.add(name) : classes.delete(name) } },
    style:{ setProperty(key, value){ attributes[key] = value } },
    append(...children){ this.children.push(...children) },
    appendChild(child){ this.children.push(child) },
    querySelectorAll(selector){ return this.children.filter(child => child.hasClass(selector.slice(1))) },
    hasClass(name){ return classes.has(name) },
  }
}

function render(values){
  const elements = new Map()
  const get = id => { if(!elements.has(id)) elements.set(id, node()); return elements.get(id) }
  const groups = values.map((_value, i) => ({dates:[`day-${i}`], label:`Day ${i}`}))
  const source = html.match(/function renderActivityTrend\(period\)\{[\s\S]*?\n\}/)[0]
  runInNewContext(`${source}; renderActivityTrend({});`, {
    $:get, document:{createElement:node, createElementNS:node},
    activityTrendState:() => ({title:'Last 7 days',groups}),
    dailyActivity:{pushup:values.map((reps, i) => ({date:`day-${i}`,reps}))},
    activityExercise:'pushup', activityAnchor:'day-6',
    activityNumber:new Intl.NumberFormat('en-US'), activityCompactNumber:String,
    t:(key,...args) => `${key}: ${args.join(', ')}`,
  })
  return get
}

test('Figma trend displays real data and updates selection by tap or keyboard', () => {
  const get = render([24,11,22,35,4,20,17])
  assert.equal(get('activityTrendTotal').textContent, '133')
  assert.equal(get('activityTrendSelectedValue').textContent, '17')
  const hits = get('activityTrendPoints').querySelectorAll('.activityTrendHit')
  assert.equal(hits.length, 7)
  assert.equal(hits[6].attributes['aria-pressed'], 'true')
  hits[3].onclick()
  assert.equal(get('activityTrendSelectedValue').textContent, '35')
  assert.equal(hits[6].attributes['aria-pressed'], 'false')
  assert.equal(hits[3].attributes['aria-pressed'], 'true')
  let prevented = false
  hits[0].onkeydown({key:'Enter',preventDefault(){ prevented = true }})
  assert.ok(prevented)
  assert.equal(get('activityTrendSelectedValue').textContent, '24')
})

test('Figma trend handles zero and high totals without invalid geometry', () => {
  for(const values of [[0,0,0,0,0,0,0],[1,9,20,100,999,0,17]]){
    const get = render(values)
    assert.doesNotMatch(get('activityTrendLine').attributes.d, /NaN|Infinity/)
    const grid = get('activityTrendGrid').children.filter(child => child.hasClass('activityTrendAxis'))
    assert.equal(grid.length, 8)
    const ticks = grid.map(label => Number(label.textContent))
    assert.ok(ticks[0] >= Math.max(...values))
    assert.equal(ticks.at(-1), 0)
    assert.ok(ticks.every((tick, i) => i === 0 || tick < ticks[i - 1]))
  }
})
