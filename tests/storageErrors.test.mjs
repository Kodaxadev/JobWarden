// A failed save is not a lost form — it is a lost record of something that already happened
// and cannot be observed again. These pin the two things every message has to do: say the
// record was NOT saved, and say what to do next.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainStorageError } from '../js/data/storageErrors.js';

const quota = () => Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });
const blocked = () => Object.assign(new Error('Access is denied for this document.'), { name: 'SecurityError' });
const closing = () => Object.assign(new Error('The database connection is closing.'), { name: 'InvalidStateError' });
const weird = () => Object.assign(new Error('something nobody planned for'), { name: 'TypeError' });

const ALL = [quota, blocked, closing, weird];

test('every explanation says plainly that the record was not saved', () => {
  for (const make of ALL) {
    const p = explainStorageError(make());
    assert.match(p.body, /NOT saved/, `${p.kind} must not soften this`);
  }
});

test('every explanation tells the user what to do next', () => {
  for (const make of ALL) {
    const p = explainStorageError(make());
    assert.ok(p.title.length > 0 && p.title.length < 60, `${p.kind} title should be short: "${p.title}"`);
    assert.match(p.body, /\b(you can|open|close|try again|write the facts)\b/i, `${p.kind} gives no next step`);
  }
});

test('a full phone is recognized and offers the trade that keeps the facts', () => {
  const p = explainStorageError(quota());
  assert.equal(p.kind, 'full');
  assert.equal(p.canDropPhotos, true);
  assert.match(p.body, /[Pp]hotos/);
});

test('a quota error is caught by message even when the name is generic', () => {
  assert.equal(explainStorageError(new Error('Storage full: quota exceeded')).kind, 'full');
});

test('private-mode / blocked storage is named for what it is, and dropping photos will not help', () => {
  const p = explainStorageError(blocked());
  assert.equal(p.kind, 'blocked');
  assert.equal(p.canDropPhotos, false);
  assert.match(p.body, /private or incognito/i);
});

test('a closing connection points at the other tab, not at the user', () => {
  const p = explainStorageError(closing());
  assert.equal(p.kind, 'closed');
  assert.equal(p.canDropPhotos, false);
  assert.match(p.body, /tab/i);
});

test('an unknown failure keeps the record on screen and says to write the facts down', () => {
  const p = explainStorageError(weird());
  assert.equal(p.kind, 'unknown');
  assert.match(p.body, /still on this screen/);
  assert.match(p.body, /write the facts down/i);
  assert.ok(p.body.includes('TypeError'), 'the raw error is still there for support, at the end');
});

test('nothing thrown at it can make it throw', () => {
  for (const junk of [null, undefined, '', 0, 'a string', { name: 42 }, new Error()]) {
    const p = explainStorageError(junk);
    assert.ok(p.kind && p.title && p.body, `failed on ${JSON.stringify(junk)}`);
  }
});

test('the raw error text is truncated, so a huge message cannot swamp the dialog', () => {
  const p = explainStorageError(new Error('x'.repeat(5000)));
  assert.ok(p.body.length < 400, `body was ${p.body.length} chars`);
});
