import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRules } from '../js/rules/index.js';
import { createIncident } from '../js/domain/incidentModel.js';

test('getRules returns California by default and for unknown jurisdictions', () => {
  const ca = getRules('CA');
  assert.equal(typeof ca.analyze, 'function');
  assert.equal(getRules(undefined), ca);   // missing -> CA
  assert.equal(getRules('XX'), ca);         // unknown -> CA
  assert.equal(getRules('NY'), ca);         // NY not implemented yet (slice 1) -> CA fallback
});

test('records carry a jurisdiction (default CA) and flags come through the dispatch', () => {
  const i = createIncident({ incidentDate: '2026-06-16', types: ['late_meal'], clockIn: '09:00', clockOut: '17:30', meal: { start: '14:40', end: '15:10' } });
  assert.equal(i.jurisdiction, 'CA');
  assert.ok((i.flags || []).some(f => f.key === 'lateMeal'));   // CA rule still fires via getRules
});

test('an explicit jurisdiction is preserved on the record', () => {
  assert.equal(createIncident({ incidentDate: '2026-06-16', types: ['late_meal'], jurisdiction: 'CA' }).jurisdiction, 'CA');
});
