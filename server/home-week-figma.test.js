import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const reference = await readFile(new URL('../design/figma/home-week.reference.txt', import.meta.url), 'utf8')

test('Home-week matches the exported frame, summary cards and plot dimensions', () => {
  assert.match(reference, /width: 430px;\s*height: 932px;/)
  assert.match(html, /#activityWeekView \.activitySummary>div\{[^}]*width:calc\(189\.5 \* var\(--home-unit\)\);height:calc\(91 \* var\(--home-unit\)\)/)
  assert.match(html, /#activityWeekView \.activitySummary>\.activitySummaryEnd\{width:calc\(188\.5 \* var\(--home-unit\)\);height:calc\(90 \* var\(--home-unit\)\)/)
  assert.match(html, /\.activityWeekCard\{width:100%;height:calc\(244 \* var\(--home-unit\)\)/)
  assert.match(html, /\.activityWeekChart\{[^}]*height:calc\(153 \* var\(--home-unit\)\);padding:0 calc\(18 \* var\(--home-unit\)\);gap:calc\(20 \* var\(--home-unit\)\)/)
})

test('Week average is left, total is right, using Benzin Bold 34 and Montserrat labels', () => {
  const view = html.slice(html.indexOf('<div id="activityWeekView"'), html.indexOf('<div id="activityMonthView"'))
  assert.ok(view.indexOf('id="activityWeekAverage"') < view.indexOf('id="activityWeekTotal"'))
  assert.match(view, /id="activityWeekChartTotal"/)
  assert.match(html, /#activityWeekView \.activitySummary strong\{font-family:"Benzin",sans-serif;font-weight:700;font-size:calc\(34 \* var\(--home-unit\)\)/)
  assert.match(html, /#activityWeekView \.activitySummary small\{[^}]*font-family:"Montserrat",sans-serif;font-weight:400;font-size:calc\(12 \* var\(--home-unit\)\)/)
  assert.match(html, /\$\("activityWeekTotal"\)\.textContent = activityNumber.format\(total\)/)
  assert.match(html, /\$\("activityWeekChartTotal"\)\.textContent = activityNumber.format\(total\)/)
  assert.match(html, /\$\("activityWeekTotalLabel"\)\.textContent = t\(isSquat \? "activityWeekTotalSquatLabel" : "activityWeekTotalPushupLabel"\)/)
})

function element(){
  let text = ''
  const attributes = {}
  return {
    children:[], attributes,
    get textContent(){ return text },
    set textContent(value){ text = String(value); this.children = [] },
    setAttribute(name, value){ attributes[name] = String(value) },
    style:{setProperty(name, value){attributes[name] = value}},
    append(...children){this.children.push(...children)},
    appendChild(child){this.children.push(child)},
  }
}

function render(values, today = '2026-09-06'){
  const elements = new Map()
  const get = id => {if(!elements.has(id)) elements.set(id, element()); return elements.get(id)}
  const days = values.map((reps,i)=>({date:`2026-09-0${i + 1}`,reps}))
  let opened
  const source = html.slice(html.indexOf('  const weekChart = $("activityWeekChart");'), html.indexOf('  const monthGrid = $("activityMonthGrid");'))
  runInNewContext(source, {
    $:get, document:{createElement:element}, days, todayKey:today,
    activityNumber:new Intl.NumberFormat('en-US'), activityCompactNumber:String,
    exerciseA11yLabel:'push-ups',t:(key,...args)=>`${key} ${args.join(' ')}`,
    openActivityDay:date => {opened = date},
  })
  return {get, opened:()=>opened}
}

test('Week bars and nine axis ticks share a data-driven scale with no artificial minimum', () => {
  const {get} = render([1,5,10,20,30,40,0])
  assert.deepEqual(get('activityWeekAxis').children.map(row=>Number(row.children[0].textContent)),[40,35,30,25,20,15,10,5,0])
  const plots = get('activityWeekChart').children.map(button=>button.children[0])
  assert.equal(plots[0].attributes['--bar-height'],'2.5%')
  assert.equal(plots[5].attributes['--bar-height'],'100%')
  assert.equal(plots[6].attributes['--bar-height'],undefined)
  assert.equal(get('activityWeekLabels').children.length,7)
})

test('Week zero state and large values remain finite and inside the bar tracks', () => {
  for(const values of [[0,0,0,0,0,0,0],[1,5,20,40,100,500,999]]){
    const {get} = render(values)
    const maximum = Number(get('activityWeekAxis').children[0].children[0].textContent)
    assert.ok(maximum >= Math.max(...values))
    for(const button of get('activityWeekChart').children){
      const height = parseFloat(button.children[0].attributes['--bar-height'] || '0')
      assert.ok(Number.isFinite(height) && height >= 0 && height <= 100)
    }
  }
})

test('Week preserves day drill-down and disables future dates', () => {
  const {get,opened} = render([14,16,11,27,40,27,22],'2026-09-02')
  const buttons = get('activityWeekChart').children
  assert.equal(buttons[0].disabled,false)
  assert.equal(buttons[1].disabled,false)
  assert.ok(buttons.slice(2).every(button=>button.disabled))
  buttons[0].onclick()
  assert.equal(opened(),'2026-09-01')
  assert.match(buttons[0].attributes['aria-label'],/2026-09-01 14 push-ups/)
})
