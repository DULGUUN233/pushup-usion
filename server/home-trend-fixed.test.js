import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const names = ['activityDateFromKey', 'activityShiftDate', 'activityDayDistance', 'activityPeriodState', 'activityTrendState', 'loadDailyActivity']
const source = names.map(name => html.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0]).join('\n')

function context(anchor, exercise = 'pushup'){
  const requests = []
  return {
    requests, activityAnchor:anchor, activityRange:'day', activityExercise:exercise,
    activityRequests:{pushup:0,squat:0}, dailyActivity:{pushup:[],squat:[]}, localTimeZone:'Asia/Ulaanbaatar',
    activityDateKey:(date) => date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : '2026-09-09',
    t:key => key, $:() => ({setAttribute(){},removeAttribute(){}}),
    cacheDailyActivity(){}, renderDailyActivity(){},
    api:async url => {
      const params = new URL(url, 'http://localhost').searchParams
      requests.push(params)
      return {days:[{date:params.get('end'),reps:12}]}
    },
  }
}

test('daily lower chart stays on the latest seven days when the upper day changes', () => {
  for(const anchor of ['2026-09-09','2026-09-03','2025-01-01']){
    const result = runInNewContext(`${source}; activityTrendState()`, context(anchor))
    assert.deepEqual(Array.from(result.groups, group => group.dates[0]), [
      '2026-09-03','2026-09-04','2026-09-05','2026-09-06','2026-09-07','2026-09-08','2026-09-09',
    ])
    assert.equal(result.requestDays, 7)
    assert.equal(result.requestEnd, '2026-09-09')
  }
})

test('old selected day and comparison load separately without replacing recent chart data', async () => {
  for(const exercise of ['pushup','squat']){
    const state = context('2025-01-01', exercise)
    await runInNewContext(`${source}; loadDailyActivity()`, state)
    assert.equal(state.requests.length, 2)
    assert.equal(state.requests[0].get('days'), '7')
    assert.equal(state.requests[0].get('end'), '2026-09-09')
    assert.equal(state.requests[1].get('days'), '2')
    assert.equal(state.requests[1].get('end'), '2025-01-01')
    assert.ok(state.requests.every(params => params.get('exercise') === exercise))
    assert.deepEqual(Array.from(state.dailyActivity[exercise], day => day.date), ['2025-01-01','2026-09-09'])
  }
})

test('today only needs the seven-day request', async () => {
  const state = context('2026-09-09')
  await runInNewContext(`${source}; loadDailyActivity()`, state)
  assert.equal(state.requests.length, 1)
})

test('lower chart is outside the swipe viewport and has no swipe listener', () => {
  const start = html.indexOf('<div id="activityViewport"')
  const end = html.indexOf('<section class="activityTrendCard"', start)
  const tags = html.slice(start, end).match(/<\/?div\b[^>]*>/g)
  assert.equal(tags.reduce((depth, tag) => depth + (tag.startsWith('</') ? -1 : 1), 0), 0)
  assert.doesNotMatch(html, /\$\("activityTrend(?:Chart|Card)"\)\.addEventListener\("pointer/)
})
