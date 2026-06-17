// service-worker.js — offline app shell cache. One concern: caching + offline fallback.
const CACHE = 'jobwarden-v6';
const ASSETS = [
  './', './index.html', './install.html', './manifest.webmanifest',
  './css/styles.css', './css/tokens.css', './css/shell.css', './css/forms.css', './css/records.css',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './js/app.js',
  './js/config/infractionTypes.js', './js/config/uiCopy.js',
  './js/domain/timeUtils.js', './js/domain/breakRules.js', './js/domain/incidentModel.js',
  './js/data/db.js', './js/data/incidentRepo.js', './js/data/settingsRepo.js',
  './js/capture/geo.js', './js/capture/media.js', './js/capture/captureFields.js', './js/capture/captureForm.js',
  './js/ui/dom.js', './js/ui/icons.js', './js/ui/incidentList.js', './js/ui/exportView.js', './js/ui/settingsView.js',
  './js/export/download.js', './js/export/exportJson.js', './js/export/exportCsv.js',
  './js/export/exportReport.js', './js/export/backup.js',
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
