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

test('the entry points and all HTML shells are cached', () => {
  for (const required of [...ENTRIES, 'index.html', 'landing.html', 'install.html', 'manifest.webmanifest']) {
    assert.ok(ASSETS.includes(required), `${required} must be cached`);
  }
  assert.ok(ASSETS.includes(''), 'the app root "./" must be cached for offline launch');
});

test('every stylesheet the pages link is cached', () => {
  const linked = new Set();
  for (const page of ['index.html', 'landing.html', 'install.html', 'privacy.html', 'terms.html']) {
    for (const m of readFileSync(page, 'utf8').matchAll(/href="\.\/(css\/[^"]+\.css)"/g)) linked.add(m[1]);
  }
  const missing = [...linked].filter(c => !ASSETS.includes(c)).sort();
  assert.deepEqual(missing, [], `add these stylesheets to ASSETS: ${missing.join(', ')}`);
});

// A UI module that imports a symbol nobody exports is a blank screen at runtime and a
// perfectly green test suite — no test imports the view layer, so nothing catches it. This
// checks every named import across the app resolves to a real export in the target module.
// (Found the real thing: onboarding.js imported ONBOARD_ACK before disclaimers.js had it.)
test('every named import resolves to something the target module actually exports', () => {
  const broken = [];
  for (const file of reachableModules(ENTRIES)) {
    const src = readFileSync(file, 'utf8');
    const dir = dirname(file).split(/[\\/]/).join('/');
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'(\.[^']+)'/g)) {
      const target = posix.normalize(posix.join(dir, m[2]));
      if (!existsSync(target)) { broken.push(`${file} -> missing module ${target}`); continue; }
      const targetSrc = readFileSync(target, 'utf8');
      for (const raw of m[1].split(',')) {
        const name = raw.trim().split(/\s+as\s+/)[0].trim();
        if (!name) continue;
        const exported = new RegExp(
          `export\\s+(const|let|var|function|async function|class)\\s+${name}\\b`
          + `|export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`,
        );
        if (!exported.test(targetSrc)) broken.push(`${file} imports { ${name} } — ${target} does not export it`);
      }
    }
  }
  assert.deepEqual(broken, [], broken.join('\n'));
});

test('the cache name is bumped whenever cached assets change (it carries a version)', () => {
  const m = /const CACHE = 'jobwarden-v(\d+)'/.exec(SW);
  assert.ok(m, 'CACHE must be a versioned jobwarden-vN name');
  assert.ok(Number(m[1]) > 0);
});
