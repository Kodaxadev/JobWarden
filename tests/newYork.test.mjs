import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRules } from '../js/rules/index.js';
import { createIncident } from '../js/domain/incidentModel.js';

const ny = (over = {}) => createIncident({ jurisdiction: 'NY', incidentDate: '2026-06-16', ...over });
const flagsOf = i => Object.fromEntries((i.flags || []).map(f => [f.key, f.value]));

test('getRules dispatches New York to its own rule set', () => {
  assert.notEqual(getRules('NY').analyze, getRules('CA').analyze);
});

test('a NY record is analyzed by NY rules', () => {
  const i = ny({ clockIn: '08:00', clockOut: '18:30' });
  assert.equal(i.jurisdiction, 'NY');
  assert.ok((i.flags || []).some(f => f.key === 'spreadOver10'));   // a NY-only flag
});

test('spread of hours fires when the workday SPANS over 10 hours', () => {
  assert.equal(flagsOf(ny({ clockIn: '08:00', clockOut: '18:30' })).spreadOver10, 10.5);
  assert.equal(flagsOf(ny({ clockIn: '09:00', clockOut: '17:00' })).spreadOver10, undefined);
});

test('§162 meal owed on a 6h+ shift over the noon period, none recorded', () => {
  const fk = flagsOf(ny({ clockIn: '09:00', clockOut: '17:30', types: ['missed_meal'], meal: { taken: false } }));
  assert.equal(fk.nyMealMissing, true);
});

test('evening meal owed when the shift starts before 11am and runs past 7pm', () => {
  assert.equal(flagsOf(ny({ clockIn: '08:00', clockOut: '20:00' })).nyEveningMeal, true);
});

test('DIVERGENCE: New York produces NO rest-break findings', () => {
  const fk = flagsOf(ny({ clockIn: '08:00', clockOut: '18:00', rest: { taken: 0 } }));
  assert.equal(fk.restRequired, undefined);
  assert.equal(fk.restShortfall, undefined);
});

test('DIVERGENCE: no alternative-workweek / daily-OT concept in New York', () => {
  const fk = flagsOf(ny({ clockIn: '09:00', clockOut: '19:00', classification: { awsElection: 'yes' } }));
  assert.equal(fk.awsNote, undefined);                 // CA-only concept
  assert.equal(fk.nyOvertimeNote, true);               // instead: weekly-OT note on a long day
});

test('DIVERGENCE: final pay flags NY timing (§191), not California §203 days-late', () => {
  const fk = flagsOf(ny({ types: ['final_pay'], finalPay: { separation: 'fired', lastDay: '2026-06-01', datePaid: '2026-06-20', fullyPaid: false } }));
  assert.equal(fk.nyFinalPayShort, true);
  assert.equal(fk.finalPayLate, undefined);            // no §203 waiting-time math in NY
});

test('retaliation cites NY §215', () => {
  const i = ny({ types: ['retaliation'], notice: { adverseAction: 'cut my hours' } });
  assert.equal(flagsOf(i).nyRetaliation, true);
  assert.ok((i.flags || []).find(f => f.key === 'nyRetaliation').note.includes('§215'));
});

test('California still gets CA rest findings (regression: the seam did not change CA)', () => {
  const fk = flagsOf(createIncident({ jurisdiction: 'CA', incidentDate: '2026-06-16', clockIn: '08:00', clockOut: '18:00', rest: { taken: 0 } }));
  assert.ok(fk.restRequired != null);                  // CA emits the rest ladder; NY does not
});
