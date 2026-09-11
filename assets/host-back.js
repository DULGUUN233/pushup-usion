// Same native/web protocol as UsionFlow's useMiniappBackButton.
(() => {
  let callback = null;
  let handling = false;
  function post(type){
    const native = window.ReactNativeWebView;
    if(typeof native?.postMessage === 'function') native.postMessage(JSON.stringify({type}));
    else if(window.parent !== window) window.parent.postMessage({type}, '*');
  }
  function receive(event){
    // Browser messages must come from the embedding host, not sibling frames.
    if(!window.ReactNativeWebView && event.source !== window.parent) return;
    let data;
    try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; }
    catch { return; }
    if(data?.type !== 'BACK_BUTTON_PRESSED' || !callback || handling) return;
    const onBack = callback;
    callback = null;
    handling = true;
    try { onBack(); }
    finally {
      // Some WebViews deliver the same press on document and window.
      queueMicrotask(() => { handling = false; });
    }
  }
  window.addEventListener('message', receive);
  document.addEventListener('message', receive);
  window.HostBack = {
    claimBackButton(onBack){ callback = onBack; post('CLAIM_BACK_BUTTON'); },
    releaseBackButton(){ callback = null; post('RELEASE_BACK_BUTTON'); },
  };
})();
