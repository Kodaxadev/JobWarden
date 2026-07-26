// If the database will not open, every screen has nothing to read and nothing can be saved.
// That used to be a toast — which disappears after two seconds and leaves an empty shell a
// person can still type a record into, believing it is kept. The causes are ordinary for this
// audience: a private window (keeping the app out of normal browsing), "block all cookies", a
// locked-down work phone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explainStorageError } from '../js/data/storageErrors.js';

// A DOM small enough to render one card into, and to read back.
function stubDocument() {
  const make = (tag) => ({
    tagName: tag, className: '', attrs: {}, children: [], textContent: '',
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter(x => x !== c); },
    get firstChild() { return this.children[0] || null; },
    get firstElementChild() { return this.children[0] || null; },
    set innerHTML(_v) { this.children = [make('svg')]; },
    addEventListener(type, fn) { (this.listeners ||= {})[type] = fn; },
    querySelector() { return null; },
  });
  globalThis.document = { createElement: make, createTextNode: (t) => ({ textContent: t }) };
  return make;
}

// Walk the rendered tree for all the words in it.
function textOf(node) {
  const parts = [node.textContent || ''];
  for (const c of node.children || []) parts.push(textOf(c));
  return parts.join(' ');
}

async function render(error) {
  stubDocument();
  const { renderStorageUnavailable } = await import('../js/ui/storageUnavailable.js');
  const host = { children: [], appendChild(c) { this.children.push(c); }, get firstChild() { return this.children[0] || null; }, removeChild(c) { this.children = this.children.filter(x => x !== c); } };
  renderStorageUnavailable(host, error, { onRetry: () => {} });
  return { host, text: textOf(host.children[0]) };
}

test('the screen says the app cannot save here, before anything is typed', async () => {
  const { host, text } = await render(new DOMExceptionish('SecurityError', 'The operation is insecure.'));
  assert.equal(host.children.length, 1, 'one card, rendered into the empty view');
  assert.match(text, /cannot save on this phone/i);
  assert.match(text, /Nothing you enter here would be kept/i);
  assert.equal(host.children[0].attrs.role, 'alert', 'it has to be announced, not just drawn');
});

test('a blocked browser gets the cause, not a failed-write message about a record', async () => {
  const { text } = await render(new DOMExceptionish('SecurityError', 'access is denied'));
  assert.match(text, /private or incognito window/i);
  assert.match(text, /block all cookies/i);
  // The write-failure copy opens with "Your record was NOT saved" — untrue here; nothing was
  // entered yet. The cause and the remedy carry over, that sentence must not.
  assert.doesNotMatch(text, /record was NOT saved/i);
  assert.match(explainStorageError({ name: 'SecurityError' }).body, /record was NOT saved/i,
    'the write-failure copy still says it where it IS true');
});

test('it promises nothing about deleting, and offers a way back', async () => {
  const { text } = await render(new Error('IndexedDB unavailable'));
  assert.match(text, /does not delete anything/i, 'a scary screen must not imply data loss');
  assert.match(text, /normal browser window|allow this site to store data/i);
  assert.match(text, /Try again/);
});

test('the browser’s own reason is kept, last and bounded', async () => {
  const { text } = await render(new DOMExceptionish('UnknownError', 'x'.repeat(600)));
  assert.match(text, /Reported by this browser: UnknownError/);
  assert.ok(text.length < 1400, 'a runaway message must not become the whole screen');
});

test('an unrecognisable failure still renders rather than throwing', async () => {
  for (const junk of [null, undefined, 'a string', 42, {}]) {
    await assert.doesNotReject(() => render(junk));
  }
});

// The app is the only caller, and the value is entirely in it being wired to BOTH failure
// points: the open, and the first read after a clean open.
test('the app shows it instead of leaving an empty shell', () => {
  const app = readFileSync('js/app.js', 'utf8');
  assert.match(app, /catch \(e\) \{\s*clear\(bannerHost\);\s*renderStorageUnavailable/,
    'a database that will not open must render the explanation');
  assert.match(app, /boot\(\)\.catch\(/, 'and so must a rejection later in boot');
  assert.doesNotMatch(app, /toast\('Storage unavailable/, 'this cannot go back to being a toast');
});

// Minimal stand-in for a DOMException, which Node has but which is awkward to construct with a
// chosen name.
function DOMExceptionish(name, message) {
  return { name, message };
}
