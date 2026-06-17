import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stampIntegrity, verifyIntegrity, contentHashOf, manifestHash, stableStringify,
} from '../js/domain/integrity.js';
import { createIncident, reviseIncident } from '../js/domain/incidentModel.js';

const base = (over = {}) => createIncident({ incidentDate: '2026-06-16', types: ['late_meal'], clockIn: '09:00', clockOut: '17:30', ...over });

test('stableStringify is key-order independent', () => {
  assert.equal(stableStringify({ a: 1, b: { c: 2, d: 3 } }), stableStringify({ b: { d: 3, c: 2 }, a: 1 }));
});

test('sealing produces fingerprints that verify clean', async () => {
  const sealed = await stampIntegrity(base({ narrative: 'skipped lunch' }));
  assert.ok(sealed.contentHash && sealed.recordHash && sealed.sealedAt);
  const v = await verifyIntegrity(sealed);
  assert.equal(v.sealed, true);
  assert.equal(v.ok, true);
});

test('changing a field after sealing is detected', async () => {
  const sealed = await stampIntegrity(base({ narrative: 'original' }));
  const tampered = { ...sealed, narrative: 'changed after sealing' };
  const v = await verifyIntegrity(tampered);
  assert.equal(v.contentOk, false);
  assert.equal(v.ok, false);
});

test('content hash is independent of issue-type ordering', async () => {
  const a = createIncident({ incidentDate: '2026-06-16', types: ['rest_missed', 'late_meal'], clockIn: '09:00' });
  const reordered = { ...a, types: ['late_meal', 'rest_missed'] };
  assert.equal(await contentHashOf(a), await contentHashOf(reordered));
});

test('editing preserves createdAt, changes the record fingerprint, re-verifies', async () => {
  const sealed = await stampIntegrity(base());
  const resealed = await stampIntegrity(reviseIncident(sealed, { narrative: 'added detail' }));
  assert.equal(resealed.createdAt, sealed.createdAt);
  assert.notEqual(resealed.recordHash, sealed.recordHash);
  assert.equal((await verifyIntegrity(resealed)).ok, true);
});

test('a photo gets a file hash, and swapping its bytes is detected', async () => {
  const dataUrl = 'data:text/plain;base64,' + Buffer.from('photo-bytes').toString('base64');
  const sealed = await stampIntegrity(base({ attachments: [{ id: 'a1', name: 'p.jpg', type: 'text/plain', size: 11, dataUrl }] }));
  assert.ok(sealed.attachments[0].sha256);
  assert.equal((await verifyIntegrity(sealed)).ok, true);

  const swapped = { ...sealed, attachments: [{ ...sealed.attachments[0], dataUrl: 'data:text/plain;base64,' + Buffer.from('different').toString('base64') }] };
  const v = await verifyIntegrity(swapped);
  assert.equal(v.attachmentsOk, false);
  assert.equal(v.ok, false);
});

test('manifest hash is deterministic and order-sensitive', async () => {
  const s1 = await stampIntegrity(base());
  const s2 = await stampIntegrity(base({ incidentDate: '2026-06-17', types: ['rest_missed'] }));
  assert.equal(await manifestHash([s1, s2]), await manifestHash([s1, s2]));
  assert.notEqual(await manifestHash([s1, s2]), await manifestHash([s2, s1]));
});

test('an unsealed record reports sealed:false', async () => {
  const v = await verifyIntegrity(base());
  assert.equal(v.sealed, false);
});
