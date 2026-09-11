// Opt-in, device-local back-button trace. Never store config, tokens or media.
(() => {
  const key = 'pushup:back-diagnostics:v1';
  let state = { enabled:false, events:[] };
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if(saved && Array.isArray(saved.events)) state = {enabled:saved.enabled === true, events:saved.events.slice(-80)};
  } catch {}
  const persist = () => {
    try { localStorage.setItem(key, JSON.stringify(state)); return true; } catch { return false; }
  };
  const record = (event, screen = '') => {
    if(!state.enabled) return;
    const u = window.Usion;
    state.events.push({time:new Date().toISOString(), event, screen,
      sdk:typeof u?.version === 'string' ? u.version : 'missing',
      bridge:window.ReactNativeWebView ? 'native' : window.parent !== window ? 'iframe' : 'standalone'});
    state.events = state.events.slice(-80);
    persist();
  };
  window.BackDiagnostics = {record};
  record('page-open');
  window.addEventListener('pagehide', () => record('pagehide'));
  window.addEventListener('focus', () => record('focus'));
  document.addEventListener('visibilitychange', () => record(document.hidden ? 'hidden' : 'visible'));

  const mount = () => {
    const menu = document.getElementById('menu');
    if(!menu) return;
    const panel = document.createElement('details');
    panel.id = 'backDiagnostics';
    panel.style.cssText = 'margin:24px 16px 100px;color:var(--fg);font:14px/1.5 sans-serif';
    const summary = document.createElement('summary');
    summary.style.cssText = 'min-height:44px;cursor:pointer';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.style.cssText = 'min-height:44px;margin:8px 0';
    const hint = document.createElement('p');
    const log = document.createElement('textarea');
    log.readOnly = true;
    log.style.cssText = 'display:block;box-sizing:border-box;width:100%;height:240px;font:16px/1.5 monospace;user-select:text;-webkit-user-select:text';
    const render = () => {
      const mn = document.documentElement.lang === 'mn';
      summary.textContent = mn ? 'X / Back оношилгоо' : 'X / Back diagnostics';
      toggle.textContent = mn ? (state.enabled ? 'Бичлэг зогсоох' : 'Шинэ шалгалт эхлүүлэх') : (state.enabled ? 'Stop recording' : 'Start new trace');
      toggle.setAttribute('aria-pressed', String(state.enabled));
      hint.textContent = mn ? 'Асаагаад X-ийг шалга. Хаагдвал дахин нээгээд эндээс логийг хуулж явуул. Зөвхөн энэ төхөөрөмжид хадгална.' : 'Start, then test X. If the app closes, reopen and copy this log. Stored only on this device.';
      log.setAttribute('aria-label', mn ? 'Back оношилгооны лог' : 'Back diagnostic log');
      log.value = state.events.map(row => JSON.stringify(row)).join('\n');
    };
    toggle.onclick = () => {
      state.enabled = !state.enabled;
      if(state.enabled) { state.events = []; record('trace-start'); }
      const stored = persist();
      render();
      if(!stored) hint.textContent = document.documentElement.lang === 'mn' ? 'Төхөөрөмжийн хадгалалт хаалттай. Гарахаасаа өмнө логийг хуулна уу.' : 'Storage unavailable. Copy the log before closing.';
    };
    panel.addEventListener('toggle', render);
    panel.append(summary, toggle, hint, log);
    menu.append(panel);
    render();
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
