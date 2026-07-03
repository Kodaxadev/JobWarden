import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createIncident, reviseIncident, softDelete, restoreIncident, validateIncident, SCHEMA_VERSION,
} from '../js/domain/incidentModel.js';
import * as model from '../js/domain/incidentModel.js';

test('createIncident normalizes, computes flags, stamps immutable createdAt', () => {
  const i = createIncident({ incidentDate: '2026-06-16', clockIn: '09:00', clockOut: '17:30', types: ['late_meal'], meal: { start: '14:30', end: '14:50' } });
  assert.ok(i.id && i.createdAt);
  assert.equal(i.schemaVersion, SCHEMA_VERSION);
  assert.ok(i.flags.find(f => f.key === 'lateMeal'));
  assert.ok(i.flags.find(f => f.key === 'shortMeal'));
});

test('reviseIncident records field-level old→new diffs and preserves createdAt', () => {
  const i = createIncident({ incidentDate: '2026-06-16', types: ['late_meal'], clockIn: '09:00' });
  const r = reviseIncident(i, { clockIn: '08:30', narrative: 'added detail' });
  assert.equal(r.createdAt, i.createdAt);
  assert.equal(r.editLog.length, 1);
  const changed = r.editLog[0].changes;
  const clock = changed.find(c => c.field === 'clockIn');
  assert.equal(clock.from, '09:00');
  assert.equal(clock.to, '08:30');
  assert.ok(changed.find(c => c.field === 'narrative'));
});

test('softDelete and restore toggle deleted with audit entries', () => {
  const i = createIncident({ incidentDate: '2026-06-16', types: ['rest_missed'] });
  const d = softDelete(i, 'duplicate');
  assert.equal(d.deleted, true);
  assert.equal(d.deleteReason, 'duplicate');
  assert.equal(d.editLog.at(-1).note, 'deleted');
  const r = restoreIncident(d);
  assert.equal(r.deleted, false);
  assert.equal(r.editLog.at(-1).note, 'restored');
});

test('validate requires a date and at least one type', () => {
  assert.equal(validateIncident(createIncident({ types: [], incidentDate: '' })).valid, false);
  assert.equal(validateIncident(createIncident({ types: ['late_meal'], incidentDate: '2026-06-16' })).valid, true);
});

test('hydrateIncident upgrades legacy records and recomputes current flags', () => {
  assert.equal(typeof model.hydrateIncident, 'function');
  const legacy = {
    id: 'legacy-1',
    schemaVersion: 1,
    createdAt: '2026-06-16T16:00:00.000Z',
    capturedTz: 'America/Los_Angeles',
    incidentDate: '2026-06-16',
    clockIn: '08:00',
    clockOut: '19:00',
    types: ['second_meal_missed'],
    meal: { start: '12:00', end: '12:30' },
    flags: [{ key: 'hoursWorked', value: 10.5 }],
    editLog: [],
  };
  const hydrated = model.hydrateIncident(legacy);
  assert.equal(hydrated.id, legacy.id);
  assert.equal(hydrated.createdAt, legacy.createdAt);
  assert.equal(hydrated.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(hydrated.meal2, { start: '', end: '', taken: null, waived: false });
  assert.ok(hydrated.flags.find(f => f.key === 'secondMealMissed'));
});

// --- non-blocking time-sanity warnings (audit §2) --------------------------

test('sanityWarnings flags an implausibly long shift but not a normal one', () => {
  // 9:00 -> 8:00 reads as ~23h (a likely clock-out/clock-in swap) -> warns.
  assert.ok(model.sanityWarnings({ clockIn: '09:00', clockOut: '08:00' }).some(w => /16 hours/.test(w)));
  // A real 8.5h day is silent.
  assert.equal(model.sanityWarnings({ clockIn: '09:00', clockOut: '17:30' }).length, 0);
});

test('sanityWarnings does not false-alarm on a genuine overnight shift', () => {
  // 22:00 -> 06:00 is 8h across midnight, not a typo.
  assert.equal(model.sanityWarnings({ clockIn: '22:00', clockOut: '06:00' }).length, 0);
});

test('sanityWarnings flags a future date and an over-long lunch', () => {
  const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  assert.ok(model.sanityWarnings({ incidentDate: future }).some(w => /future/.test(w)));
  assert.ok(model.sanityWarnings({ clockIn: '08:00', clockOut: '18:00', meal: { start: '10:00', end: '15:00' } }).some(w => /lunch/.test(w)));
});
