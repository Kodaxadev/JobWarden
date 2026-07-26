import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup, restorableRecord } from '../js/export/importBackup.js';
import { restoreResultCopy } from '../js/ui/restoreStatus.js';

test('parseBackup accepts a valid JobWarden backup', () => {
  const data = parseBackup(JSON.stringify({ app: 'JobWarden', schema: 2, records: [{ id: 'a' }, { id: 'b' }] }));
  assert.equal(data.records.length, 2);
});

test('parseBackup rejects unreadable or foreign files', () => {
  assert.throws(() => parseBackup('not json at all'), /not readable/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'SomethingElse', records: [] })), /not a JobWarden/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'JobWarden' })), /not a JobWarden/);
});

// Restore is the one path that writes a record shape the app did not build. A wrong-typed
// field there is stored permanently and then thrown on by every read: the list sort calls
// localeCompare on incidentDate, and the screens and exports map over types and attachments.
// So the shapes that would break Records after they land have to be refused before they do.
test('a record whose fields are the wrong type is refused, not stored', () => {
  const ok = { id: 'a', incidentDate: '2026-06-01', types: ['missed_meal'], attachments: [] };
  assert.equal(restorableRecord(ok), true);
  assert.equal(restorableRecord({ ...ok, incidentDate: 20260601 }), false, 'the list sort would throw');
  assert.equal(restorableRecord({ ...ok, types: 'missed_meal' }), false, 'every screen maps over types');
  assert.equal(restorableRecord({ ...ok, attachments: {} }), false, 'the report maps over attachments');
  assert.equal(restorableRecord({ ...ok, editLog: 'edited once' }), false);
  assert.equal(restorableRecord({ ...ok, narrative: 42 }), false);
});

test('a record with no usable database key is refused', () => {
  assert.equal(restorableRecord(null), false);
  assert.equal(restorableRecord({}), false);
  assert.equal(restorableRecord({ id: '' }), false);
  assert.equal(restorableRecord({ id: { v: 1 } }), false);
  assert.equal(restorableRecord([{ id: 'a' }]), false);
});

test('absent fields are fine — old backups predate most of the schema', () => {
  assert.equal(restorableRecord({ id: 'a' }), true);
  assert.equal(restorableRecord({ id: 'a', types: null, attachments: undefined }), true);
});

test('records that could not be read are reported, never silently dropped', () => {
  const partial = restoreResultCopy({ added: 3, skipped: 0, unreadable: 2 });
  assert.equal(partial.tone, 'warning');
  assert.match(partial.detail, /2 could not be read/);
  assert.match(partial.detail, /Keep this backup file/);
  const none = restoreResultCopy({ added: 0, unreadable: 2 });
  assert.equal(none.tone, 'error', 'nothing restored is not a success');
  // A fingerprint warning must not hide the bigger problem of missing records.
  assert.match(restoreResultCopy({ added: 1, changed: 1, unreadable: 1 }).detail, /could not be read/);
});

// --- backup round-trip: Blob-built parts parse back cleanly (audit §3) ------

import { buildBackupPayload, buildBackupParts } from '../js/export/exportJson.js';
import { createIncident } from '../js/domain/incidentModel.js';

test('a built backup round-trips through parseBackup with records intact', async () => {
  const incidents = [
    createIncident({ incidentDate: '2026-06-01', types: ['missed_meal'], clockIn: '08:00', clockOut: '16:00' }),
    createIncident({ incidentDate: '2026-06-02', types: ['late_meal'], clockIn: '09:00', clockOut: '17:30', meal: { start: '14:40', end: '15:10' },
      attachments: [{ id: 'p1', name: 'stub.jpg', type: 'image/jpeg', size: 12, sha256: 'abc', dataUrl: 'data:image/jpeg;base64,AAAA' }] }),
  ];
  const { text, count } = await buildBackupPayload(incidents, { employer: 'Acme', jurisdiction: 'CA' });
  assert.equal(count, 2);
  const parsed = parseBackup(text);
  assert.equal(parsed.app, 'JobWarden');
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.records[0].incidentDate, '2026-06-01');
  assert.equal(parsed.records[1].attachments[0].dataUrl, 'data:image/jpeg;base64,AAAA');
  assert.ok(parsed.integrity && parsed.integrity.manifestHash);
});

test('buildBackupParts emits valid JSON as an array of parts (not one megastring)', async () => {
  const { parts } = await buildBackupParts([createIncident({ incidentDate: '2026-06-01', types: ['rest_missed'] })], {});
  assert.ok(Array.isArray(parts) && parts.length >= 3);      // head + >=1 record + tail
  assert.doesNotThrow(() => JSON.parse(parts.join('')));      // the concatenation is valid JSON
});
