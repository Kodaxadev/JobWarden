// The seal's promise is that a record sealed today still verifies years from now, after
// the schema has grown. That promise rests on two conventions that used to live only in a
// comment in integrity.js. These turn them into gates.
//
// 1. A new schema field must default to an EMPTY value ('' / null / {} / []), because
//    pruning drops empties before hashing — so the field is invisible to old seals.
//    A `false` default would be hashed and would break every record sealed before it.
// 2. The v2 content view is frozen. Change the view, the normalizers, or the pruning,
//    and every existing seal breaks — which is a SEAL_VERSION bump plus a legacy read
//    path in verifyIntegrity, never a silent edit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentView, contentHashOf, verifyIntegrity, stampIntegrity, SEAL_VERSION } from '../js/domain/integrity.js';
import { createIncident, hydrateIncident } from '../js/domain/incidentModel.js';

// Every non-empty default a blank record carries into the seal. Adding to this list means
// records sealed before the addition no longer verify — see convention 1 above.
const BLANK_SEALED_DEFAULTS = {
  v: 2,
  meal: { interrupted: false, onCall: false, waived: false },
  meal2: { waived: false },
  rest: { interrupted: false, onCall: false },
};

test('a blank record carries no new non-empty defaults into the seal', () => {
  const view = contentView(createIncident({}), 2);
  delete view.createdAt;   // per-record provenance, not a schema default
  delete view.capturedTz;
  assert.deepEqual(view, BLANK_SEALED_DEFAULTS,
    'a new schema field must default to "" or null — a false/0 default breaks every existing seal');
});

test('SEAL_VERSION is 2 — bumping it requires a legacy read path, so it is pinned here', () => {
  assert.equal(SEAL_VERSION, 2);
});

// A fully-specified record in the exact shape the repo stores. Fixed timestamps so the
// hash is deterministic. This is the golden fixture: its hash must not move.
const FIXTURE = Object.freeze({
  id: 'seal-contract-1',
  schemaVersion: 3,
  createdAt: '2026-06-16T15:04:05.000Z',
  capturedTz: 'America/Los_Angeles',
  jurisdiction: 'CA',
  incidentDate: '2026-06-16',
  workplace: 'Store #12',
  location: { lat: 34.05, lon: -118.24, accuracy: 12 },
  clockIn: '08:00',
  clockOut: '19:30',
  types: ['missed_meal', 'off_clock_work'],
  classification: { payType: 'hourly', awsElection: 'no', cbaCovered: 'no' },
  meal: {
    start: '', end: '', interrupted: false, interruptedBy: '', detail: '',
    onCall: false, relievedOfDuty: false, taken: false, waived: false, writtenAgreement: '',
  },
  meal2: { start: '', end: '', taken: false, waived: false },
  rest: { taken: 1, interrupted: false, onCall: false },
  offClock: {
    start: '19:30', end: '20:05', task: 'closing count', directedBy: 'Manager',
    knownBy: '', payPeriod: '2026-06-16', expectedPay: '', employerEdited: true,
  },
  notice: { to: 'Manager', channel: 'text', response: 'ignored', adverseAction: '' },
  finalPay: { separation: '', lastDay: '', datePaid: '', fullyPaid: null },
  witnesses: 'Ana R.',
  narrative: 'Worked through lunch, then counted the drawer after clocking out.',
  attachments: [{ id: 'a1', name: 'timeclock.jpg', type: 'image/jpeg', size: 4096, sha256: 'ab'.repeat(32) }],
  deleted: false, deletedAt: '', deleteReason: '', editLog: [],
});

// Regenerate ONLY together with a SEAL_VERSION bump and a legacy path in verifyIntegrity.
const GOLDEN_CONTENT_HASH = 'cdb0797559cf8c2b74d6601fd194c605471ba8b68e4b354d20cec40fadb95498';

test('the v2 content hash of the golden fixture has not moved', async () => {
  assert.equal(await contentHashOf(FIXTURE, 2), GOLDEN_CONTENT_HASH,
    'the sealed content view changed — bump SEAL_VERSION and add a legacy read path');
});

test('hydrating a stored record does not change what it hashes to', async () => {
  const before = await contentHashOf(FIXTURE, 2);
  const after = await contentHashOf(hydrateIncident(FIXTURE), 2);
  assert.equal(after, before, 'the read path must never disturb a seal');
});

test('a record sealed today verifies after every empty-defaulted field the schema could add', async () => {
  const sealed = await stampIntegrity(createIncident({
    incidentDate: '2026-06-16', types: ['missed_meal'], clockIn: '08:00', clockOut: '17:00',
  }));
  const grown = {
    ...sealed,
    splitShift: { start: '', end: '' },     // a plausible future §4 IWC addition
    reportingTime: null,
    expenses: [],
    meal: { ...sealed.meal, premiumPaid: '' },
    offClock: { ...sealed.offClock, deviceUsed: '' },
  };
  assert.equal((await verifyIntegrity(grown)).ok, true);
});

test('a future field that defaults to false would break the seal — which is why it is banned', async () => {
  const sealed = await stampIntegrity(createIncident({
    incidentDate: '2026-06-16', types: ['missed_meal'], clockIn: '08:00', clockOut: '17:00',
  }));
  const badlyGrown = { ...sealed, meal: { ...sealed.meal, premiumPaid: false } };
  assert.equal((await verifyIntegrity(badlyGrown)).contentOk, false);
});
