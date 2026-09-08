import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const reference = await readFile(new URL('../design/figma/home-month.reference.txt', import.meta.url), 'utf8')

test('Month keeps the exported nested card sizes and number fonts', () => {
  assert.match(reference, /width: 430px;\s*height: 975px;/)
  const styles = html.slice(html.indexOf('/* Home-month 450:246'), html.indexOf('  #mainNav{', html.indexOf('/* Home-month 450:246')))
  for(const size of [83.5,89,88,373,340,48]) assert.ok(styles.includes(`height:calc(${size} * var(--home-unit))`))
  assert.match(styles, /width:calc\(360 \* var\(--home-unit\)\)/)
  assert.match(styles, /font-family:"Benzin",sans-serif;font-weight:700;font-size:calc\(34 \* var\(--home-unit\)\)/)
  assert.match(styles, /radial-gradient\(53\.37% 53\.37% at 50% -0\.97%/)
  assert.match(styles, /radial-gradient\(68\.88% 68\.88% at 50\.16% 1\.19%,#fbbf24 0%,#f97316 100%\)/)
  const view = html.slice(html.indexOf('<div id="activityMonthView"'), html.indexOf('<section class="activityTrendCard"'))
  assert.ok(view.indexOf('id="activityMonthAverage"') < view.indexOf('id="activityMonthTotal"'))
  assert.ok(view.indexOf('id="activityMonthTotal"') < view.indexOf('class="activityMonth"'))
})

function element(){
  return {children:[],attributes:{},classes:new Set(),style:{setProperty(key,value){this[key]=value}},
    classList:{add(name){this.owner.classes.add(name)}},
    setAttribute(key,value){this.attributes[key]=value},appendChild(child){this.children.push(child)}}
}

function render(month, today){
  const create = () => {const node=element();node.classList.owner=node;return node}
  const grid=create()
  const [year,monthNumber]=month.split('-').map(Number)
  const days=Array.from({length:new Date(year,monthNumber,0).getDate()},(_,i)=>({date:`${month}-${String(i+1).padStart(2,'0')}`,reps:[0,10,20,40][i%4]}))
  let opened
  const dateHelpers=html.slice(html.indexOf('function activityDateKey('),html.indexOf('function activityDayDistance('))
  const source=html.slice(html.indexOf('  const monthGrid = $("activityMonthGrid");'),html.indexOf('  renderActivityTrend(period);',html.indexOf('  const monthGrid = $("activityMonthGrid");')))
  runInNewContext(dateHelpers+source, {$:()=>grid,document:{createElement:create},activityRange:'month',period:{dates:days.map(day=>day.date)},days,todayKey:today,
    DAILY_GOALS:{pushup:20},activityExercise:'pushup',activityNumber:new Intl.NumberFormat('en-US'),exerciseA11yLabel:'push-ups',
    t:(key,...args)=>args.join(' '),openActivityDay:date=>{opened=date}})
  return {cells:grid.children,opened:()=>opened}
}

test('Month has six Monday-first rows, including adjacent dates and leap February', () => {
  for(const [month,firstDate,offset,length] of [['2026-08','27',5,31],['2026-02','26',6,28],['2024-02','29',3,29]]){
    const {cells}=render(month,`${month}-15`)
    assert.equal(cells.length,42)
    assert.equal(cells[0].textContent,firstDate)
    assert.equal(cells[offset].children[0].textContent,'1')
    assert.equal(cells.filter(cell=>cell.className==='activityMonthDay').length,length)
    assert.equal(cells.at(-1).attributes['aria-hidden'],'true')
  }
})

test('Month progress, future disabling and day drill-down still use real data', () => {
  const {cells,opened}=render('2026-08','2026-08-03')
  const dates=cells.filter(cell=>cell.className==='activityMonthDay')
  assert.ok(dates[0].classes.has('empty'))
  assert.ok(dates[1].classes.has('partial'))
  assert.equal(dates[1].style['--activity-progress'],'50%')
  assert.ok(dates[2].classes.has('complete'))
  assert.equal(dates[2].attributes['aria-current'],'date')
  assert.equal(dates[3].style['--activity-progress'],'100%')
  assert.ok(dates.slice(3).every(cell=>cell.disabled))
  dates[1].onclick()
  assert.equal(opened(),'2026-08-02')
  assert.match(dates[1].attributes['aria-label'],/2026-08-02 10 push-ups/)
})
