// The one path in the app that destroys data on purpose. It has to be complete — a wipe that
// leaves the records behind is worse than no wipe at all, because the person believes they are
// gone — and it has to be honest about what it cannot reach.
import 'fake-indexeddb/auto';

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, tx, STORE_INCIDENTS, STORE_SETTINGS } from '../js/data/db.js';
import { addIncident, putIncident, getIncident, countIncidents } from '../js/data/incidentRepo.js';
import { getSettings, saveSettings } from '../js/data/settingsRepo.js';
import { saveActiveShift, getActiveShift } from '../js/data/shiftRepo.js';
import { createIncident, softDelete } from '../js/domain/incidentModel.js';
import { logError, readErrors } from '../js/data/errorLog.js';
import { eraseEverything } from '../js/data/eraseAll.js';
import { eraseWarning } from '../js/ui/eraseData.js';

const rec = (over = {}) => createIncident({
  incidentDate: '2026-06-16', types: ['missed_meal'], clockIn: '08:00', clockOut: '17:00', ...over,
});

// eraseAll sweeps localStorage by prefix; Node has no localStorage, so stand one up.
function stubStorage() {
  const map = new Map();
  globalThis.localStorage = {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i],
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
  return map;
}

beforeEach(async () => {
  await openDb();
  for (const store of [STORE_INCIDENTS, STORE_SETTINGS]) {
    await tx(store, 'readwrite', s => new Promise((res, rej) => {
      const r = s.clear(); r.onsuccess = res; r.onerror = () => rej(r.error);
    }));
  }
  stubStorage();
});

test('erasing takes the records, the recoverable ones, the profile and the live shift', async () => {
  const keep = rec();
  const binned = rec({ incidentDate: '2026-06-01' });
  await addIncident(keep);
  await addIncident(binned);
  await putIncident(softDelete(await getIncident(binned.id), 'logged twice'));
  await saveSettings({ employeeName: 'A. Worker', workplaces: ['Store #12'], onboardedAt: '2026-06-01T10:00:00Z' });
  await saveActiveShift({ startedAt: '2026-06-16T08:00:00Z' });

  const { records } = await eraseEverything();
  assert.equal(records, 2, 'the count reported back includes the recoverable Deleted record');
  assert.equal(await countIncidents({ includeDeleted: true }), 0);
  assert.equal(await getIncident(keep.id), undefined);
  assert.equal(await getActiveShift(), null, 'a live timer must not outlive the profile it belongs to');

  const after = await getSettings();
  assert.equal(after.employeeName, '');
  assert.deepEqual(after.workplaces, []);
  assert.equal(after.onboardedAt, '', 'the app should come back as it was before first use');
});

test('erasing also clears what the app keeps outside the database', async () => {
  const store = stubStorage();
  logError('something broke', 'test');
  store.set('jobwarden.theme', 'light');
  store.set('someone-elses-key', 'left alone');
  assert.equal(readErrors().length, 1);

  await eraseEverything();
  assert.deepEqual(readErrors(), [], 'the diagnostics log names files and failures — it goes too');
  assert.equal(store.get('jobwarden.theme'), undefined);
  assert.equal(store.get('someone-elses-key'), 'left alone', 'only this app’s keys are ours to remove');
});

test('erasing an empty phone is a no-op that still reports honestly', async () => {
  const { records } = await eraseEverything();
  assert.equal(records, 0);
});

test('a browser with no storage access still erases the database', async () => {
  await addIncident(rec());
  globalThis.localStorage = {
    get length() { throw new Error('private browsing'); },
    getItem() { throw new Error('private browsing'); },
    setItem() { throw new Error('private browsing'); },
    removeItem() { throw new Error('private browsing'); },
  };
  await eraseEverything();
  assert.equal(await countIncidents({ includeDeleted: true }), 0);
});

// The dialog is the only thing between a tap and permanent loss, so it has to count what goes
// and say what it cannot undo. It is deliberately one dialog: whoever reaches for this may be
// about to hand the phone over.
test('the warning counts the records and names what erasing cannot reach', () => {
  const w = eraseWarning({ records: 12, lastBackupAt: new Date(Date.now() - 3 * 86400000).toISOString() });
  assert.match(w.message, /12 records, their photos/);
  assert.match(w.message, /cannot be undone/i);
  assert.match(w.message, /does not reach backup files or emails/i);
  assert.match(w.message, /3 days ago/);
  assert.match(w.confirmText, /^Erase 12 records$/, 'the button says what it does, not "OK"');
  assert.match(w.cancelText, /Keep my records/);
});

test('the warning is sharpest when no backup exists at all', () => {
  const none = eraseWarning({ records: 4, lastBackupAt: '' });
  assert.match(none.message, /never saved a backup/i);
  assert.match(none.message, /no copy of these records anywhere else/i);
  // One record is the common case for someone who logged something they want gone, so the
  // sentence has to read like a person wrote it rather than a counter.
  const single = eraseWarning({ records: 1, lastBackupAt: '' });
  assert.equal(single.confirmText, 'Erase 1 record');
  assert.match(single.message, /1 record, its photos/);
  assert.equal(single.cancelText, 'Keep my record');
  assert.doesNotMatch(single.message, /\bthem\b/, 'one record is not "them"');
  assert.match(eraseWarning({ records: 2, lastBackupAt: new Date().toISOString() }).message, /saved today/);
});

// Deleted is a holding area by design. Emptying one record out of it is the smaller version of
// the same promise, and it carries the same duty not to overstate what deletion accomplishes.
test('deleting one record forever admits that saved backups still hold it', async () => {
  const { confirmForeverCopy } = await import('../js/ui/deletedRecords.js');
  const c = confirmForeverCopy();
  assert.match(c.message, /for good/i);
  assert.match(c.message, /cannot be undone/i);
  assert.match(c.message, /backup files you already saved still contain it/i);
  assert.equal(c.confirmText, 'Delete forever');
  assert.equal(c.cancelText, 'Keep it in Deleted');
  assert.equal(c.danger, true, 'the dialog has to look like what it is');
});

test('with nothing logged the warning stops claiming records will be deleted', () => {
  const w = eraseWarning({ records: 0 });
  assert.match(w.message, /no records to delete/i);
  assert.doesNotMatch(w.confirmText, /record/i);
  assert.doesNotMatch(w.message, /cannot be undone/i, 'do not borrow gravity a settings reset has not earned');
});
