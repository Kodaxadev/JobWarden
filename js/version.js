// version.js — ask the active service worker for its cache id (the deployed build).
// Resolves '' when there's no controller (first load before the SW takes over) or on timeout.
export function swVersion(timeoutMs = 600) {
  return new Promise(resolve => {
    const sw = navigator.serviceWorker;
    if (!sw || !sw.controller) return resolve('');
    let settled = false;
    const done = v => { if (!settled) { settled = true; resolve(v); } };
    const ch = new MessageChannel();
    ch.port1.onmessage = e => done((e.data && e.data.version) || '');
    try { sw.controller.postMessage({ type: 'version' }, [ch.port2]); }
    catch { return done(''); }
    setTimeout(() => done(''), timeoutMs);
  });
}
