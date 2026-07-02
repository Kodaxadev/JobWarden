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

// --- seal versioning (audit A2 + A3) ----------------------------------------

import { createHash } from 'node:crypto';
import { hydrateIncident } from '../js/domain/incidentModel.js';

const nodeSha256 = s => createHash('sha256').update(s).digest('hex');

// Reproduce the ORIGINAL (pre-versioning) sealer: dense content view of the
// record's whole normalized shape at its time, no sealVersion field.
function legacySeal(i) {
  const view = {
    createdAt: i.createdAt || '', capturedTz: i.capturedTz || '',
    incidentDate: i.incidentDate || '', workplace: i.workplace || '', location: i.location || null,
    clockIn: i.clockIn || '', clockOut: i.clockOut || '',
    types: [...(i.types || [])].sort(),
    classification: i.classification || {}, meal: i.meal || {}, meal2: i.meal2 || {},
    rest: i.rest || {}, offClock: i.offClock || {}, notice: i.notice || {},
    witnesses: i.witnesses || '', narrative: i.narrative || '',
    attachments: [],
  };
  const contentHash = nodeSha256(stableStringify(view));
  const recordView = { createdAt: i.createdAt || '', contentHash, deleted: !!i.deleted, editLog: [] };
  return { ...i, contentHash, recordHash: nodeSha256(stableStringify(recordView)), sealedAt: i.createdAt };
}

test('a record sealed BEFORE meal.writtenAgreement existed still verifies after hydration', async () => {
  // Old-schema shape: meal has no writtenAgreement key, no finalPay, no sealVersion.
  const old = {
    id: 'legacy-1', createdAt: '2026-05-01T08:00:00.000Z', capturedTz: 'America/Los_Angeles',
    incidentDate: '2026-05-01', workplace: 'Shop', clockIn: '08:00', clockOut: '16:00',
    types: ['missed_meal'],
    classification: { payType: 'hourly', awsElection: '', cbaCovered: '' },
    meal: { start: '', end: '', interrupted: false, interruptedBy: '', detail: '', onCall: false, relievedOfDuty: null, taken: false, waived: false },
    meal2: { start: '', end: '', taken: null, waived: false },
    rest: { taken: null, interrupted: false, onCall: false },
    offClock: { start: '', end: '', task: '', directedBy: '', knownBy: '', payPeriod: '', expectedPay: '', employerEdited: null },
    notice: { to: '', channel: '', response: '', adverseAction: '' },
    witnesses: '', narrative: '', attachments: [], deleted: false, editLog: [],
  };
  const sealed = legacySeal(old);
  // Read path: hydration upgrades the schema (adds writtenAgreement, finalPay, …).
  const hydrated = hydrateIncident(sealed);
  const v = await verifyIntegrity(hydrated);
  assert.equal(v.sealed, true);
  assert.equal(v.ok, true, 'schema growth must never read as tampering');
});

test('legacy verification still catches real tampering', async () => {
  const sealed = legacySeal({
    id: 'legacy-2', createdAt: '2026-05-01T08:00:00.000Z', incidentDate: '2026-05-01',
    workplace: 'Shop', clockIn: '08:00', clockOut: '16:00', types: ['missed_meal'],
    meal: {}, meal2: {}, rest: {}, offClock: {}, notice: {}, classification: {},
    witnesses: '', narrative: 'original', attachments: [], deleted: false, editLog: [],
  });
  const v = await verifyIntegrity(hydrateIncident({ ...sealed, narrative: 'changed later' }));
  assert.equal(v.ok, false);
});

test('v2 seals survive a FUTURE schema field with an empty default', async () => {
  const sealed = await stampIntegrity(base({ narrative: 'facts' }));
  // Simulate tomorrow's hydration adding new empty fields everywhere.
  const future = { ...sealed, meal: { ...sealed.meal, someNewField: '' }, someNewTopLevel: null };
  const v = await verifyIntegrity(future);
  assert.equal(v.ok, true, 'empty defaults must be invisible to the seal');
});

test('v2 seals cover finalPay — changing the payout date is detected', async () => {
  const sealed = await stampIntegrity(base({
    types: ['final_pay'],
    finalPay: { separation: 'fired', lastDay: '2026-06-01', datePaid: '2026-06-09', fullyPaid: false },
  }));
  assert.equal((await verifyIntegrity(sealed)).ok, true);
  const tampered = { ...sealed, finalPay: { ...sealed.finalPay, datePaid: '2026-06-01' } };
  assert.equal((await verifyIntegrity(tampered)).contentOk, false);
});

test('v2 seals treat a "no" answer as substance — flipping it to unknown is detected', async () => {
  const sealed = await stampIntegrity(base({ meal: { start: '12:00', end: '12:30', relievedOfDuty: false } }));
  const tampered = { ...sealed, meal: { ...sealed.meal, relievedOfDuty: null } };
  assert.equal((await verifyIntegrity(tampered)).contentOk, false);
});
