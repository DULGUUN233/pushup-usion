import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'

const source = await readFile(new URL('../assets/host-back.js', import.meta.url), 'utf8')
function setup(native){
  const sent = [], listeners = {}, tasks = [];
  const parent = {postMessage:message => sent.push(message)};
  const window = {parent, addEventListener:(_name, fn) => {listeners.window=fn}};
  if(native) window.ReactNativeWebView = {postMessage:message => sent.push(JSON.parse(message))};
  runInNewContext(source, {window, document:{addEventListener:(_name, fn) => {listeners.document=fn}}, queueMicrotask:fn => tasks.push(fn)});
  return {back:window.HostBack, sent, parent, listeners, flush:() => {while(tasks.length) tasks.shift()()}};
}
for(const native of [true,false]) test(`${native ? 'native string' : 'web object'}: one press per screen, release on Home`, () => {
  const h=setup(native);
  let screen='play';
  h.back.claimBackButton(() => {
    screen='chooser';
    h.back.claimBackButton(() => {screen='home';h.back.releaseBackButton()});
  });
  const event={source:h.parent,data:native ? '{"type":"BACK_BUTTON_PRESSED"}' : {type:'BACK_BUTTON_PRESSED'}};
  h.listeners.window(event);
  h.listeners.document(event);
  assert.equal(screen,'chooser');
  h.flush();
  h.listeners.window(event);
  assert.equal(screen,'home');
  h.flush();
  h.listeners.window(event);
  assert.equal(screen,'home');
  assert.deepEqual(h.sent.map(row=>row.type),['CLAIM_BACK_BUTTON','CLAIM_BACK_BUTTON','RELEASE_BACK_BUTTON']);
});
test('ignores malformed, unrelated and non-host web messages', () => {
  const h=setup(false);
  let presses=0;
  h.back.claimBackButton(()=>presses++);
  for(const event of [{source:h.parent,data:'{'},{source:h.parent,data:{type:'OTHER'}},{source:{},data:{type:'BACK_BUTTON_PRESSED'}}]) h.listeners.window(event);
  assert.equal(presses,0);
});
