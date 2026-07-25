import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reminderPermissionCopy } from '../js/ui/reminderPermission.js';
import { systemStatusState } from '../js/ui/systemStatus.js';

test('first run names local-only storage, offline use, and backup responsibility', () => {
  const src = readFileSync('js/ui/onboarding.js', 'utf8');
  assert.match(src, /No account or cloud sync/);
  assert.match(src, /logging works without a connection/);
  assert.match(src, /clearing browser data can erase records/);
});

test('starting a shift never triggers a surprise permission prompt', () => {
  const shift = readFileSync('js/ui/shiftPanel.js', 'utf8');
  assert.doesNotMatch(shift, /requestPermission/);
  assert.match(readFileSync('js/ui/reminderPermission.js', 'utf8'), /requestPermission/);
});

test('every shift-alert permission state gives an honest fallback', () => {
  const backup = 'Set a phone alarm as backup.';
  for (const state of ['granted', 'default', 'denied', 'unsupported']) {
    const copy = reminderPermissionCopy(state, backup);
    assert.ok(copy.title);
    assert.match(copy.detail, /phone alarm/);
  }
  assert.match(reminderPermissionCopy('denied', backup).detail, /browser settings/);
  assert.match(reminderPermissionCopy('granted', backup).detail, /must stay open/);
});

test('offline and update states stay precise and actionable', () => {
  assert.equal(systemStatusState({ online: true, updateReady: false }), null);
  const offline = systemStatusState({ online: false, updateReady: false });
  assert.equal(offline.title, 'Working offline');
  assert.match(offline.detail, /still work on this phone/);
  const update = systemStatusState({ online: true, updateReady: true });
  assert.equal(update.actionLabel, 'Update now');
  assert.match(update.detail, /unsaved entry/);
});

test('app update action checks the active navigation guard before reload', () => {
  const app = readFileSync('js/app.js', 'utf8');
  assert.match(app, /navigationGuard && !await navigationGuard\(\)/);
  assert.match(app, /location\.reload\(\)/);
});
