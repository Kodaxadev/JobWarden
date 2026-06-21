// service-worker.js — offline app shell cache. One concern: caching + offline fallback.
const CACHE = 'jobwarden-v42';
const ASSETS = [
  './', './index.html', './install.html', './manifest.webmanifest',
  './css/styles.css', './css/tokens.css', './css/shell.css', './css/forms.css', './css/records.css',
  './fonts/geist-sans-latin-400-normal.woff2', './fonts/geist-sans-latin-500-normal.woff2', './fonts/geist-sans-latin-600-normal.woff2',
  './fonts/geist-mono-latin-400-normal.woff2', './fonts/geist-mono-latin-500-normal.woff2',
  './fonts/cinzel-latin-600-normal.woff2', './fonts/cinzel-latin-700-normal.woff2',
  './icons/logo-mark.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './js/app.js',
  './js/config/infractionTypes.js', './js/config/uiCopy.js', './js/config/jurisdictions.js',
  './js/domain/timeUtils.js', './js/domain/breakRules.js', './js/domain/incidentModel.js', './js/domain/integrity.js', './js/domain/patterns.js', './js/domain/shiftClock.js',
  './js/data/db.js', './js/data/incidentRepo.js', './js/data/settingsRepo.js', './js/data/shiftRepo.js',
  './js/capture/geo.js', './js/capture/media.js', './js/capture/captureFields.js', './js/capture/captureForm.js', './js/capture/quickCapture.js',
  './js/ui/dom.js', './js/ui/icons.js', './js/ui/incidentList.js', './js/ui/exportView.js', './js/ui/settingsView.js', './js/ui/onboarding.js', './js/ui/shiftPanel.js', './js/ui/rightsFaq.js', './js/ui/legalView.js',
  './js/export/download.js', './js/export/exportJson.js', './js/export/emailExport.js', './js/export/importBackup.js', './js/export/exportCsv.js',
  './js/export/exportReport.js', './js/export/exportSummary.js', './js/export/reportBrand.js', './js/export/backup.js',
];

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

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
