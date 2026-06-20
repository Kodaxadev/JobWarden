import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shiftStatus, dueAlerts, shiftToDraft, hm } from '../js/domain/shiftClock.js';

const MS = 60000;
const at = (startIso, mins) => new Date(startIso).getTime() + mins * MS;
const START = '2026-06-18T09:00:00.000Z';

test('first meal: soon within 30 min of the 5th hour, then overdue', () => {
  const s = { startedAt: START, meals: [], restCount: 0, notified: {} };
  assert.equal(shiftStatus(s, at(START, 270)).mealState, 'soon');   // 4h30m in
  assert.equal(shiftStatus(s, at(START, 305)).mealState, 'overdue'); // past 5h
  assert.equal(shiftStatus(s, at(START, 120)).mealState, 'ok');      // early
});

test('a recorded meal clears the meal state', () => {
  const s = { startedAt: START, meals: [{ start: '2026-06-18T12:30:00.000Z', end: '2026-06-18T13:00:00.000Z' }], restCount: 0, notified: {} };
  assert.equal(shiftStatus(s, at(START, 360)).mealState, 'taken');
});

test('second meal becomes due past 10 hours with only one meal', () => {
  const s = { startedAt: START, meals: [{ start: '2026-06-18T12:00:00.000Z', end: '2026-06-18T12:30:00.000Z' }], restCount: 0, notified: {} };
  assert.equal(shiftStatus(s, at(START, 610)).secondMealDue, true);
});

test('dueAlerts fires once, then is suppressed by notified', () => {
  const s = { startedAt: START, meals: [], restCount: 0, notified: {} };
  assert.ok(dueAlerts(s, at(START, 305)).some(a => a.key === 'mealOverdue'));
  assert.equal(dueAlerts({ ...s, notified: { mealOverdue: true } }, at(START, 305)).some(a => a.key === 'mealOverdue'), false);
});

test('shiftToDraft carries times + rest, suggests missed_meal on a long no-meal shift', () => {
  const end = '2026-06-18T17:30:00.000Z';
  const d = shiftToDraft({ startedAt: START, workplace: 'Acme', meals: [], restCount: 2, notified: {} }, end, {});
  assert.equal(d.clockIn, hm(START));
  assert.equal(d.clockOut, hm(end));
  assert.equal(d.rest.taken, 2);
  assert.ok(d.types.includes('missed_meal'));
});

test('shiftToDraft suggests late_meal when the meal started after the 5th hour', () => {
  const d = shiftToDraft({ startedAt: START, meals: [{ start: '2026-06-18T14:30:00.000Z', end: '2026-06-18T15:00:00.000Z' }], restCount: 0, notified: {} }, '2026-06-18T17:30:00.000Z', {});
  assert.ok(d.types.includes('late_meal'));
});
