import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const source = html.slice(html.indexOf('function setBack('), html.indexOf('function show('))

for (const exercise of ['pushup','squat']) for (const variant of ['normal','game']) {
  test(`${exercise}/${variant}: resumed camera screen backs to chooser, then Home`, async () => {
    let screen='play', callback=null, stopped=0
    const events={}
    const trace=[]
    const sdk={claimBackButton:fn=>{callback=fn},releaseBackButton:()=>{callback=null}}
    const context={mode:'solo',exercise,soloVariant:variant,sdk:()=>sdk,queueMicrotask,
      $:id=>({classList:{contains:()=>screen!==id}}),
      document:{visibilityState:'visible',addEventListener:(name,fn)=>{events[name]=fn}},
      window:{HostBack:sdk,addEventListener:(name,fn)=>{events[name]=fn},BackDiagnostics:{record:(event,screen)=>trace.push({event,screen})}},
      stopCamera:()=>{stopped++},
      openPushChoice:kind=>{assert.equal(kind,exercise);screen='pushChoice';context.setBack(screen)},
      show:id=>{screen=id;context.setBack(id)},
    }
    runInNewContext(source,context)
    context.setBack('play')
    for(const event of ['focus','pageshow','visibilitychange']) {
      callback=null // host loses its claim while the WebView is suspended
      events[event]()
      assert.equal(typeof callback,'function')
    }
    let press=callback;callback=null;press() // SDK consumes the claim before invoking it
    callback=null // destination claim is lost during the host back event
    await new Promise(resolve=>queueMicrotask(resolve))
    assert.equal(screen,'pushChoice')
    assert.equal(stopped,1)
    assert.ok(trace.some(row=>row.event==='claim-returned' && row.screen==='play'))
    assert.ok(trace.some(row=>row.event==='back-callback' && row.screen==='play'))
    assert.ok(trace.some(row=>row.event==='back-handler-done' && row.screen==='play'))
    assert.equal(typeof callback,'function')
    for(const event of ['focus','pageshow','visibilitychange']) {
      callback=null
      events[event]()
      assert.equal(typeof callback,'function')
    }
    press=callback;callback=null;press()
    await new Promise(resolve=>queueMicrotask(resolve))
    assert.equal(screen,'menu')
    events.focus()
    assert.equal(callback,null)
    screen='play';context.mode='battle';events.focus()
    assert.equal(callback,null)
    context.mode='solo';context.document.visibilityState='hidden';events.visibilitychange()
    assert.equal(callback,null)
  })
}
