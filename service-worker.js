// service-worker.js — offline app shell cache. One concern: caching + offline fallback.
const CACHE = 'jobwarden-v95';
const ASSETS = [
  './', './index.html', './landing.html', './install.html', './privacy.html', './terms.html', './manifest.webmanifest',
  './css/styles.css', './css/tokens.css', './css/shell.css', './css/system.css', './css/forms.css', './css/actions.css', './css/records.css', './css/light.css', './css/marketing.css', './css/install.css', './css/legal.css',
  './fonts/geist-sans-latin-400-normal.woff2', './fonts/geist-sans-latin-500-normal.woff2', './fonts/geist-sans-latin-600-normal.woff2',
  './fonts/geist-mono-latin-400-normal.woff2', './fonts/geist-mono-latin-500-normal.woff2',
  './fonts/cinzel-latin-600-normal.woff2', './fonts/cinzel-latin-700-normal.woff2',
  './icons/logo-mark.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/marketing-lock.svg', './icons/marketing-shield.svg', './icons/marketing-wifi-off.svg',
  './assets/marketing-app-preview.png', './assets/marketing-paper-texture.png',
  './js/app.js', './js/installPage.js', './js/version.js',
  './js/config/infractionTypes.js', './js/config/uiCopy.js', './js/config/jurisdictions.js', './js/config/disclaimers.js', './js/config/payStatus.js', './js/config/payIssueOptions.js',
  './js/domain/timeUtils.js', './js/domain/breakRules.js', './js/domain/payIssueRules.js', './js/domain/incidentModel.js', './js/domain/integrity.js', './js/domain/patterns.js', './js/domain/shiftClock.js',
  './js/rules/index.js', './js/rules/california.js', './js/rules/newYork.js',
  './js/data/db.js', './js/data/storageErrors.js', './js/data/incidentRepo.js', './js/data/settingsRepo.js', './js/data/shiftRepo.js', './js/data/errorLog.js',
  './js/capture/geo.js', './js/capture/media.js', './js/capture/evidenceStatus.js', './js/capture/evidenceFields.js', './js/capture/fieldUi.js', './js/capture/payIssueFields.js', './js/capture/captureFields.js', './js/capture/captureForm.js', './js/capture/quickCapture.js',
  './js/ui/dom.js', './js/ui/icons.js', './js/ui/confirmDialog.js', './js/ui/statusUi.js', './js/ui/systemStatus.js', './js/ui/actionRow.js', './js/ui/navigationGuard.js', './js/ui/incidentList.js', './js/ui/exportView.js', './js/ui/restoreStatus.js', './js/ui/settingsView.js', './js/ui/onboarding.js', './js/ui/shiftPanel.js', './js/ui/reminderPermission.js', './js/ui/rightsFaq.js', './js/ui/legalView.js', './js/ui/theme.js', './js/ui/passphraseDialog.js', './js/ui/saveFailure.js',
  './js/export/download.js', './js/export/exportJson.js', './js/export/emailExport.js', './js/export/importBackup.js', './js/export/exportCsv.js',
  './js/export/exportReport.js', './js/export/exportSummary.js', './js/export/reportBrand.js', './js/export/backup.js', './js/export/backupCrypto.js',
];
// Every module the app can import must be listed above, or the app breaks OFFLINE only —
// the failure a browser tab never shows you. tests/serviceWorker.test.mjs walks the real
// import graph from the entry points and fails if anything reachable is missing.

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => null)))) // tolerate a missing asset
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Answer the app's version query (Settings shows the running build id).
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'version' && e.ports && e.ports[0]) {
    e.ports[0].postMessage({ version: CACHE });
  }
});

// Cache-first is right in production (offline is the point) and wrong in a dev loop, where
// it serves the code you just replaced. On localhost only, go network-first with the cache as
// the offline fallback — so a plain reload runs the edit, no fresh port required.
const DEV_HOST = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (DEV_HOST) {
    // cache:'reload' also skips the browser's HTTP cache, which `python -m http.server`
    // invites by sending Last-Modified with no Cache-Control. Without it, a plain reload
    // still runs yesterday's module even with the SW out of the way.
    e.respondWith(
      fetch(req, { cache: 'reload' })
        .catch(() => caches.match(req).then(hit => hit || Response.error()))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { // never cache an error page as if it were the asset
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => {
      if (req.mode !== 'navigate') return Response.error();
      const path = new URL(req.url).pathname;
      if (path.endsWith('/install.html')) return caches.match('./install.html');
      if (path.endsWith('/') || path.endsWith('/landing.html')) return caches.match('./landing.html');
      return caches.match('./index.html');
    }))
  );
});
