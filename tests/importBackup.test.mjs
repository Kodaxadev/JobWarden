import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup } from '../js/export/importBackup.js';

test('parseBackup accepts a valid JobWarden backup', () => {
  const data = parseBackup(JSON.stringify({ app: 'JobWarden', schema: 2, records: [{ id: 'a' }, { id: 'b' }] }));
  assert.equal(data.records.length, 2);
});

test('parseBackup rejects unreadable or foreign files', () => {
  assert.throws(() => parseBackup('not json at all'), /not readable/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'SomethingElse', records: [] })), /not a JobWarden/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'JobWarden' })), /not a JobWarden/);
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
