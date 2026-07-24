// The data layer is where the evidence actually lives, and it was the one layer with no
// tests: everything below ran only in a browser, where a bad write is discovered by a user
// losing a record. fake-indexeddb is a devDependency only — the app still ships zero
// runtime dependencies.
import 'fake-indexeddb/auto';

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, tx, DB_VERSION, MIGRATIONS, STORE_INCIDENTS, STORE_SETTINGS, _resetDbForTests } from '../js/data/db.js';
import {
  addIncident, putIncident, putIncidentRaw, getIncident, deleteIncident,
  getAllIncidents, getDeletedIncidents, countIncidents,
} from '../js/data/incidentRepo.js';
import { getSettings, saveSettings, markBackedUp } from '../js/data/settingsRepo.js';
import { createIncident, reviseIncident, softDelete, restoreIncident } from '../js/domain/incidentModel.js';
import { verifyIntegrity } from '../js/domain/integrity.js';

const rec = (over = {}) => createIncident({
  incidentDate: '2026-06-16', types: ['missed_meal'], clockIn: '08:00', clockOut: '17:00',
  workplace: 'Store #12', ...over,
});

beforeEach(async () => {
  await openDb();
  for (const store of [STORE_INCIDENTS, STORE_SETTINGS]) {
    await tx(store, 'readwrite', s => new Promise((res, rej) => {
      const r = s.clear(); r.onsuccess = res; r.onerror = () => rej(r.error);
    }));
  }
});

// --- schema ----------------------------------------------------------------

test('the database opens at the ladder version with both stores and their indexes', async () => {
  const db = await openDb();
  assert.equal(db.version, DB_VERSION);
  assert.ok(db.objectStoreNames.contains(STORE_INCIDENTS));
  assert.ok(db.objectStoreNames.contains(STORE_SETTINGS));
  const names = await tx(STORE_INCIDENTS, 'readonly', s => [...s.indexNames]);
  assert.deepEqual(names.sort(), ['byCreated', 'byDate']);
});

test('the version is the ladder length, so a new step cannot ship without bumping it', () => {
  assert.equal(DB_VERSION, MIGRATIONS.length);
});

// A failed upgrade retries, and a device can be several versions behind — so every step has
// to survive being run against a database that already has part of what it creates.
test('every migration step is safe to re-run against a half-built database', async () => {
  for (const [i, step] of MIGRATIONS.entries()) {
    const name = `ladder-probe-${i}-${Date.now()}`;
    const db = await new Promise((resolve, reject) => {
      const req = globalThis.indexedDB.open(name, 1);
      req.onupgradeneeded = () => {
        step(req.result, req.transaction);
        step(req.result, req.transaction);   // the retry
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    assert.ok(db.objectStoreNames.length > 0, `step ${i} created nothing`);
    db.close();
  }
});

test('reopening an existing database runs no migration and keeps the records', async () => {
  await addIncident(rec({ narrative: 'survives a reopen' }));
  _resetDbForTests();
  const all = await getAllIncidents();
  assert.equal(all.length, 1);
  assert.equal(all[0].narrative, 'survives a reopen');
});

// --- incidents -------------------------------------------------------------

test('a saved record comes back sealed and verifying', async () => {
  const r = rec({ narrative: 'no lunch' });
  await addIncident(r);
  const back = await getIncident(r.id);
  assert.equal(back.narrative, 'no lunch');
  assert.ok(back.contentHash && back.recordHash && back.sealedAt);
  assert.equal((await verifyIntegrity(back)).ok, true);
});

test('an edit reseals, keeps createdAt, and logs the change', async () => {
  const r = rec();
  await addIncident(r);
  const stored = await getIncident(r.id);
  await putIncident(reviseIncident(stored, { narrative: 'added detail' }));

  const after = await getIncident(r.id);
  assert.equal(after.createdAt, r.createdAt, 'contemporaneity: createdAt never moves');
  assert.equal(after.narrative, 'added detail');
  assert.equal(after.editLog.length, 1);
  assert.deepEqual(after.editLog[0].changes.map(c => c.field), ['narrative']);
  assert.equal((await verifyIntegrity(after)).ok, true);
});

test('a soft delete hides the record from the list but keeps it recoverable', async () => {
  const r = rec();
  await addIncident(r);
  await putIncident(softDelete(await getIncident(r.id), 'logged twice by mistake'));

  assert.equal((await getAllIncidents()).length, 0);
  assert.equal(await countIncidents(), 0);
  const deleted = await getDeletedIncidents();
  assert.equal(deleted.length, 1);
  assert.equal(deleted[0].deleteReason, 'logged twice by mistake');
  assert.equal((await getAllIncidents({ includeDeleted: true })).length, 1);

  await putIncident(restoreIncident(deleted[0]));
  assert.equal((await getAllIncidents()).length, 1);
});

test('a hard delete really removes it', async () => {
  const r = rec();
  await addIncident(r);
  await deleteIncident(r.id);
  assert.equal(await getIncident(r.id), undefined);
});

test('records come back newest first, by incident date then capture time', async () => {
  await addIncident(rec({ incidentDate: '2026-06-10' }));
  await addIncident(rec({ incidentDate: '2026-06-18' }));
  await addIncident(rec({ incidentDate: '2026-06-14' }));
  assert.deepEqual(
    (await getAllIncidents()).map(i => i.incidentDate),
    ['2026-06-18', '2026-06-14', '2026-06-10'],
  );
});

test('a restored backup keeps its ORIGINAL fingerprints — the repo does not reseal it', async () => {
  const r = rec();
  await addIncident(r);
  const sealed = await getIncident(r.id);
  await deleteIncident(r.id);

  // Import path: write the backed-up shape back untouched.
  await putIncidentRaw({ ...sealed });
  const back = await getIncident(r.id);
  assert.equal(back.contentHash, sealed.contentHash);
  assert.equal(back.sealedAt, sealed.sealedAt);
  assert.equal((await verifyIntegrity(back)).ok, true);
});

test('a record tampered with in storage reads back as not verifying', async () => {
  const r = rec({ narrative: 'original' });
  await addIncident(r);
  const sealed = await getIncident(r.id);
  await putIncidentRaw({ ...sealed, narrative: 'edited behind the app’s back' });
  assert.equal((await verifyIntegrity(await getIncident(r.id))).ok, false);
});

test('a legacy record missing newer fields is hydrated on read without breaking', async () => {
  await putIncidentRaw({
    id: 'legacy-1', createdAt: '2026-05-01T08:00:00.000Z', incidentDate: '2026-05-01',
    workplace: 'Shop', clockIn: '08:00', clockOut: '16:00', types: ['missed_meal'],
  });
  const back = await getIncident('legacy-1');
  assert.equal(back.jurisdiction, 'CA');
  assert.deepEqual(back.finalPay, { separation: '', lastDay: '', datePaid: '', fullyPaid: null });
  assert.ok(Array.isArray(back.flags) && back.flags.length > 0, 'findings are recomputed on read');
});

// --- settings --------------------------------------------------------------

test('settings return defaults before anything is saved', async () => {
  const s = await getSettings();
  assert.equal(s.jurisdiction, 'CA');
  assert.equal(s.payType, 'hourly');
  assert.equal(s.theme, 'dark');
  assert.deepEqual(s.workplaces, []);
});

test('saving settings merges rather than replacing', async () => {
  await saveSettings({ employeeName: 'Ana R.' });
  await saveSettings({ workplaces: ['Store #12'] });
  const s = await getSettings();
  assert.equal(s.employeeName, 'Ana R.', 'an earlier field is not wiped by a later save');
  assert.deepEqual(s.workplaces, ['Store #12']);
  assert.equal(s.payType, 'hourly', 'untouched defaults survive');
});

test('markBackedUp stamps a time the backup banner can read', async () => {
  assert.equal((await getSettings()).lastBackupAt, '');
  const after = await markBackedUp();
  assert.ok(Date.parse(after.lastBackupAt) > 0);
  assert.equal((await getSettings()).lastBackupAt, after.lastBackupAt);
});
