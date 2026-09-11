import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'

const source=await readFile(new URL('../assets/back-diagnostics.js',import.meta.url),'utf8')
const key='pushup:back-diagnostics:v1'
function boot(storage){
  const window={Usion:{version:'test',config:{authToken:'SECRET'}},ReactNativeWebView:{},addEventListener(){}}
  runInNewContext(source,{window,localStorage:storage,document:{readyState:'loading',addEventListener(){}}})
  return window.BackDiagnostics
}
test('trace is opt-in and persists a bounded non-sensitive history across reopening',()=>{
  const values=new Map()
  const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}
  boot(storage).record('claim-call','play')
  assert.equal(values.size,0)
  values.set(key,JSON.stringify({enabled:true,events:[]}))
  const trace=boot(storage)
  for(let i=0;i<100;i++) trace.record('claim-returned','play')
  let saved=JSON.parse(values.get(key))
  assert.equal(saved.events.length,80)
  assert.equal(saved.events.at(-1).bridge,'native')
  assert.ok(!values.get(key).includes('SECRET'))
  boot(storage)
  saved=JSON.parse(values.get(key))
  assert.equal(saved.events.at(-1).event,'page-open')
  assert.equal(saved.events.at(-2).event,'claim-returned')
})
test('blocked storage does not break navigation diagnostics',()=>{
  const trace=boot({getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}})
  assert.doesNotThrow(()=>trace.record('claim-call','play'))
})
