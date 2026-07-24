// The service worker's asset list is hand-maintained, and a module missing from it breaks
// the app OFFLINE ONLY — which is the one state a browser tab never shows you, and the
// state this app is built for. So walk the real import graph and check the list against it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';

const SW = readFileSync('service-worker.js', 'utf8');

const ASSETS = (() => {
  const body = /const ASSETS = \[([\s\S]*?)\n\];/.exec(SW);
  assert.ok(body, 'could not find the ASSETS array in service-worker.js');
  return [...body[1].matchAll(/'([^']+)'/g)].map(m => m[1].replace(/^\.\//, ''));
})();

// Follow static `import ... from '...'` edges from an entry point, relative paths only.
function reachableModules(entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/(?:^|\n)\s*import\s[^;]*?from\s*'(\.[^']+)'/g)) {
      queue.push(posix.normalize(posix.join(dirname(file).split(/[\\/]/).join('/'), m[1])));
    }
  }
  return seen;
}

const ENTRIES = ['js/app.js', 'js/installPage.js'];

test('every module the app can import is cached for offline use', () => {
  const missing = [...reachableModules(ENTRIES)].filter(f => !ASSETS.includes(f)).sort();
  assert.deepEqual(missing, [], `add these to ASSETS in service-worker.js: ${missing.join(', ')}`);
});

test('every cached path actually exists', () => {
  const gone = ASSETS.filter(a => a !== '' && !existsSync(join('.', a))).sort();
  assert.deepEqual(gone, [], `these are cached but not in the repo: ${gone.join(', ')}`);
});

test('the entry points and both HTML shells are cached', () => {
  for (const required of [...ENTRIES, 'index.html', 'install.html', 'manifest.webmanifest']) {
    assert.ok(ASSETS.includes(required), `${required} must be cached`);
  }
  assert.ok(ASSETS.includes(''), 'the app root "./" must be cached for offline launch');
});

test('every stylesheet the pages link is cached', () => {
  const linked = new Set();
  for (const page of ['index.html', 'install.html', 'privacy.html', 'terms.html']) {
    for (const m of readFileSync(page, 'utf8').matchAll(/href="\.\/(css\/[^"]+\.css)"/g)) linked.add(m[1]);
  }
  const missing = [...linked].filter(c => !ASSETS.includes(c)).sort();
  assert.deepEqual(missing, [], `add these stylesheets to ASSETS: ${missing.join(', ')}`);
});

test('the cache name is bumped whenever cached assets change (it carries a version)', () => {
  const m = /const CACHE = 'jobwarden-v(\d+)'/.exec(SW);
  assert.ok(m, 'CACHE must be a versioned jobwarden-vN name');
  assert.ok(Number(m[1]) > 0);
});
