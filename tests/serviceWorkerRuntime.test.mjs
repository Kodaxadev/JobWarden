// The service worker is the one file that can break the app for every installed user at
// once, and the only one whose mistakes survive a reinstall. tests/serviceWorker.test.mjs
// checks the asset LIST; this drives the actual install / activate / fetch handlers against
// stub globals, so the caching behaviour is pinned instead of read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('service-worker.js', 'utf8');
const ORIGIN = 'https://jobwarden.app/';
const CACHE_ID = /const CACHE = '([^']+)'/.exec(SRC)[1];
const ASSET_COUNT = [...(/const ASSETS = \[([\s\S]*?)\n\];/.exec(SRC)[1]).matchAll(/'([^']+)'/g)].length;

const keyOf = (r) => new URL(typeof r === 'string' ? r : r.url, ORIGIN).href;

// A response stub shaped like the parts of the real thing the worker touches.
function stubResponse(body, { status = 200, redirected = false, type = 'text/html' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status, statusText: 'OK', redirected,
    headers: new Headers({ 'content-type': type }),
    async blob() { return new Blob([body], { type }); },
    async text() { return body; },
    clone() { return stubResponse(body, { status, redirected, type }); },
  };
}

class FakeCache {
  constructor() { this.entries = new Map(); }
  async put(req, res) { this.entries.set(keyOf(req), res); }
  async match(req) { return this.entries.get(keyOf(req)); }
}

class FakeCaches {
  constructor() { this.stores = new Map(); }
  async open(name) {
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache());
    return this.stores.get(name);
  }
  async keys() { return [...this.stores.keys()]; }
  async delete(name) { return this.stores.delete(name); }
  async match(req) {
    for (const store of this.stores.values()) {
      const hit = await store.match(req);
      if (hit) return hit;
    }
    return undefined;
  }
}

// Load service-worker.js with every global it uses injected, so nothing here touches the
// real network or the real CacheStorage.
function loadWorker({ hostname = 'jobwarden.app', network } = {}) {
  const listeners = new Map();
  const log = { fetches: [], skipWaiting: 0, claim: 0 };
  const self = {
    addEventListener: (type, fn) => listeners.set(type, [...(listeners.get(type) || []), fn]),
    skipWaiting: () => { log.skipWaiting++; },
    clients: { claim: () => { log.claim++; } },
    location: { hostname },
  };
  const caches = new FakeCaches();
  const fetchImpl = async (req, init) => {
    log.fetches.push({ url: keyOf(req), init });
    return network(keyOf(req), req);
  };
  const ResponseStub = Response;
  ResponseStub.error = () => stubResponse('', { status: 0 });
  new Function('self', 'caches', 'fetch', 'Response', SRC)(self, caches, fetchImpl, ResponseStub);

  const fire = async (type, event) => {
    for (const fn of listeners.get(type) || []) await fn(event);
  };
  return {
    caches, log,
    async install() {
      let waited;
      await fire('install', { waitUntil: (p) => { waited = p; } });
      await waited;
    },
    async activate() {
      let waited;
      await fire('activate', { waitUntil: (p) => { waited = p; } });
      await waited;
    },
    async request(url, extra = {}) {
      let answered;
      const request = { url: new URL(url, ORIGIN).href, method: 'GET', mode: 'same-origin', ...extra };
      await fire('fetch', { request, respondWith: (p) => { answered = p; } });
      return answered === undefined ? undefined : await answered;
    },
    async ask(data) {
      const replies = [];
      await fire('message', { data, ports: [{ postMessage: (m) => replies.push(m) }] });
      return replies;
    },
  };
}

// Every asset resolves, and the root is a redirect — which is what production does.
const PRODUCTION = (url) => {
  if (url === ORIGIN) return stubResponse('LANDING', { redirected: true });
  return stubResponse('asset:' + url);
};

test('install caches every listed asset', async () => {
  const sw = loadWorker({ network: PRODUCTION });
  await sw.install();
  const store = await sw.caches.open(CACHE_ID);
  assert.equal(store.entries.size, ASSET_COUNT);
  assert.ok(await store.match('./index.html'), 'the app shell must be cached');
  assert.equal(sw.log.skipWaiting, 1, 'a finished install should not wait for every tab to close');
});

// The regression this file was written for. Production redirects '/' to the landing page.
// A redirected response cached under '/' answers a later navigation with a hard network
// error, so the site root breaks for returning visitors — online as well as off.
test('a redirecting app root is stored as a plain response, not a cached redirect', async () => {
  const sw = loadWorker({ network: PRODUCTION });
  await sw.install();
  const store = await sw.caches.open(CACHE_ID);
  const root = await store.match('./');
  assert.ok(root, 'the app root must still be cached for offline launch');
  assert.equal(root.redirected, false, 'a cached redirect cannot answer a navigation request');
  assert.equal(await root.text(), 'LANDING');
});

test('install reads from the network, not the browser HTTP cache', async () => {
  const sw = loadWorker({ network: PRODUCTION });
  await sw.install();
  const stale = sw.log.fetches.filter(f => f.init?.cache !== 'reload');
  assert.deepEqual(stale, [], 'a new build must not install the previous build’s files');
});

test('a failed or missing asset never lands in the cache as if it were the asset', async () => {
  const sw = loadWorker({
    network: (url) => {
      if (url.endsWith('/index.html')) return stubResponse('NOT FOUND', { status: 404 });
      if (url.endsWith('/landing.html')) throw new Error('offline');
      return stubResponse('ok');
    },
  });
  await sw.install();
  const store = await sw.caches.open(CACHE_ID);
  assert.equal(await store.match('./index.html'), undefined);
  assert.equal(await store.match('./landing.html'), undefined);
  assert.equal(sw.log.skipWaiting, 1, 'one unreachable asset must not abort the whole install');
});

test('activate drops older caches and keeps the current one', async () => {
  const sw = loadWorker({ network: PRODUCTION });
  (await sw.caches.open('jobwarden-v1')).put('./old.js', stubResponse('old'));
  await sw.install();
  await sw.activate();
  assert.deepEqual(await sw.caches.keys(), [CACHE_ID]);
  assert.equal(sw.log.claim, 1, 'the fresh worker should take over open pages');
});

test('on the real host the cache answers first and the network is never touched', async () => {
  const sw = loadWorker({ network: PRODUCTION });
  await sw.install();
  const before = sw.log.fetches.length;
  const res = await sw.request('./index.html');
  assert.equal(await res.text(), 'asset:' + ORIGIN + 'index.html');
  assert.equal(sw.log.fetches.length, before, 'a cached asset must not cost a request');
});

test('an offline navigation falls back to the shell that matches the path', async () => {
  const sw = loadWorker({ network: PRODUCTION });
  await sw.install();
  const offline = loadWorker({ network: () => { throw new Error('offline'); } });
  offline.caches.stores = sw.caches.stores; // same device, network gone

  const bodyOf = async (path) => (await offline.request(path, { mode: 'navigate' }))?.text();
  // The app root is cached outright — this is the launch a returning visitor makes offline.
  assert.equal(await bodyOf('./'), 'LANDING');
  // A tracking query makes the URL a cache miss, which is what sends these down the fallback.
  assert.equal(await bodyOf('./install.html?x=1'), 'asset:' + ORIGIN + 'install.html');
  assert.equal(await bodyOf('./landing.html?ref=text'), 'asset:' + ORIGIN + 'landing.html');
  assert.equal(await bodyOf('./records'), 'asset:' + ORIGIN + 'index.html', 'unknown paths open the app');
});

test('an offline request for something never cached fails instead of hanging', async () => {
  const sw = loadWorker({ network: () => { throw new Error('offline'); } });
  const res = await sw.request('./never-seen.js');
  assert.equal(res.status, 0, 'a missing sub-resource should reject, not resolve to a shell');
});

test('a runtime response is cached only when it is actually the asset', async () => {
  const sw = loadWorker({
    network: (url) => (url.endsWith('/late.js')
      ? stubResponse('late', { type: 'text/javascript' })
      : stubResponse('gone', { status: 500 })),
  });
  await sw.request('./late.js');
  await sw.request('./broken.js');
  const store = await sw.caches.open(CACHE_ID);
  assert.ok(await store.match('./late.js'), 'a good response fills the cache');
  assert.equal(await store.match('./broken.js'), undefined, 'a 500 must not be cached as the file');
});

test('writes and other non-GET requests are left alone', async () => {
  const sw = loadWorker({ network: PRODUCTION });
  assert.equal(await sw.request('./index.html', { method: 'POST' }), undefined);
});

test('on localhost the network wins so a plain reload runs the edit', async () => {
  const sw = loadWorker({ hostname: 'localhost', network: () => stubResponse('EDITED') });
  const store = await sw.caches.open(CACHE_ID);
  await store.put('./js/app.js', stubResponse('STALE'));
  const res = await sw.request('./js/app.js');
  assert.equal(await res.text(), 'EDITED');
  assert.equal(sw.log.fetches[0].init.cache, 'reload', 'the dev loop also bypasses the HTTP cache');
});

test('localhost still falls back to the cache when the dev server is down', async () => {
  const sw = loadWorker({ hostname: '127.0.0.1', network: () => { throw new Error('server down'); } });
  const store = await sw.caches.open(CACHE_ID);
  await store.put('./js/app.js', stubResponse('CACHED'));
  assert.equal(await (await sw.request('./js/app.js')).text(), 'CACHED');
});

// Settings → About shows this string, and it is the only build id a user can read back when
// they report a problem. A silent worker there means every bug report is unanswerable.
test('the worker reports its build id to the app', async () => {
  const sw = loadWorker({ network: PRODUCTION });
  assert.deepEqual(await sw.ask({ type: 'version' }), [{ version: CACHE_ID }]);
  assert.deepEqual(await sw.ask({ type: 'something-else' }), [], 'only the version query is answered');
});
