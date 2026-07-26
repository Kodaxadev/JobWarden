// The light theme exists so the log can be read in full sun on a cheap screen. Two things
// used to give that away as bolted on: the app opened dark and snapped to light once the
// database answered, and the phone's own status bar stayed black above a cream header.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { paintTheme, readThemePref, rememberThemePref, resolveTheme, THEME_KEY } from '../js/ui/themePref.js';

// themePref.js touches exactly three globals — documentElement, one meta tag, and storage.
function stubBrowser({ systemPrefersLight = false, storage = true } = {}) {
  const root = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const meta = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  globalThis.document = {
    documentElement: root,
    querySelector: (sel) => (sel === 'meta[name="theme-color"]' ? meta : null),
  };
  const map = new Map();
  globalThis.localStorage = storage ? {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  } : {
    getItem() { throw new Error('private browsing'); },
    setItem() { throw new Error('private browsing'); },
  };
  globalThis.matchMedia = (query) => ({ matches: systemPrefersLight && /light/.test(query) });
  return { root, meta, map };
}

test('a preference resolves to exactly one of the two themes', () => {
  stubBrowser();
  assert.equal(resolveTheme('light'), 'light');
  assert.equal(resolveTheme('dark'), 'dark');
  assert.equal(resolveTheme(''), 'dark', 'dark is the brand default');
  assert.equal(resolveTheme('nonsense'), 'dark');
  assert.equal(resolveTheme('system'), 'dark', 'system follows the OS, which here prefers dark');
  stubBrowser({ systemPrefersLight: true });
  assert.equal(resolveTheme('system'), 'light');
});

test('the phone’s chrome colour follows the theme, so no black bar sits over a cream header', () => {
  const { root, meta } = stubBrowser();
  paintTheme('light');
  assert.equal(root.attrs['data-theme'], 'light');
  const lightChrome = meta.attrs.content;
  paintTheme('dark');
  assert.equal(root.attrs['data-theme'], 'dark');
  const darkChrome = meta.attrs.content;

  assert.match(lightChrome, /^#[0-9a-f]{6}$/i);
  assert.notEqual(lightChrome, darkChrome, 'one colour cannot serve both themes');
  const brightness = (hex) => [1, 3, 5].reduce((sum, at) => sum + parseInt(hex.slice(at, at + 2), 16), 0);
  assert.ok(brightness(lightChrome) > brightness(darkChrome), 'the light theme takes the light chrome');
});

test('the preference is mirrored where the next launch can read it before painting', () => {
  const { map } = stubBrowser();
  assert.equal(readThemePref(), 'dark', 'no mirror yet means the default');
  rememberThemePref('light');
  assert.equal(map.get(THEME_KEY), 'light');
  assert.equal(readThemePref(), 'light');
});

test('a browser that refuses storage still gets a theme instead of an exception', () => {
  stubBrowser({ storage: false });
  assert.doesNotThrow(() => rememberThemePref('light'));
  assert.equal(readThemePref(), 'dark');
});

test('painting works before the body exists, and survives a page with no theme-color tag', () => {
  stubBrowser();
  globalThis.document.querySelector = () => null;
  assert.doesNotThrow(() => paintTheme('light'));
  assert.equal(globalThis.document.documentElement.attrs['data-theme'], 'light');
});

// The whole point of the pre-paint applier is that it does NOT wait for anything. An import of
// the data layer here would put IndexedDB back on the critical path and the flash would return.
test('the pre-paint applier pulls in nothing but the preference module', () => {
  const boot = readFileSync('js/ui/themeBoot.js', 'utf8');
  const imports = [...boot.matchAll(/from\s*'([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(imports, ['./themePref.js']);

  const head = readFileSync('index.html', 'utf8').split('</head>')[0];
  assert.match(head, /<script type="module" src="\.\/js\/ui\/themeBoot\.js"><\/script>/,
    'it has to run from <head>, before the first paint');
  assert.ok(
    head.indexOf('themeBoot.js') < head.indexOf('css/styles.css'),
    'the theme attribute should be set before the stylesheet that reads it',
  );
});
