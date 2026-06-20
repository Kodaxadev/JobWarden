import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizePatterns, buildTimeline, dateRange } from '../js/domain/patterns.js';
import { createIncident } from '../js/domain/incidentModel.js';

// A late + short lunch on an 8.5h shift.
const lateShort = (date) => createIncident({
  incidentDate: date, types: ['late_meal'], clockIn: '09:00', clockOut: '17:30', meal: { start: '14:40', end: '14:55' },
});
// Off-the-clock work.
const offClock = (date, mins) => createIncident({
  incidentDate: date, types: ['off_clock_work'], clockIn: '08:00', clockOut: '16:00',
  offClock: { start: '16:00', end: `16:${String(mins).padStart(2, '0')}`, task: 'closing' },
});

test('summarizePatterns counts findings across records', () => {
  const s = summarizePatterns([lateShort('2026-06-01'), lateShort('2026-06-08'), offClock('2026-06-10', 20)]);
  assert.equal(s.count, 3);
  assert.equal(s.findings.lateMeal, 2);
  assert.equal(s.findings.shortMeal, 2);
  assert.equal(s.offClock.records, 1);
  assert.equal(s.offClock.totalMinutes, 20);
  assert.equal(s.issueRecords, 3);
});

test('date range spans first to last incident date', () => {
  const r = dateRange([lateShort('2026-06-10'), lateShort('2026-06-01'), lateShort('2026-06-08')]);
  assert.equal(r.from, '2026-06-01');
  assert.equal(r.to, '2026-06-10');
  assert.equal(r.days, 10);
});

test('headline + byType are sorted by count, biggest first', () => {
  const s = summarizePatterns([lateShort('2026-06-01'), lateShort('2026-06-02'), offClock('2026-06-03', 15)]);
  assert.equal(s.headline[0].key, 'lateMeal');
  assert.equal(s.headline[0].count, 2);
  assert.equal(s.byType[0].id, 'late_meal');
  assert.equal(s.byType[0].count, 2);
});

test('reported + proof counts', () => {
  const reported = createIncident({ incidentDate: '2026-06-05', types: ['complaint_raised'], notice: { to: 'manager', channel: 'text' } });
  const withProof = createIncident({ incidentDate: '2026-06-06', types: ['missed_meal'], clockIn: '09:00', clockOut: '17:00', attachments: [{ id: 'a', name: 'p.jpg' }] });
  const s = summarizePatterns([reported, withProof]);
  assert.equal(s.reportedCount, 1);
  assert.equal(s.withProofCount, 1);
});

test('timeline is chronological, oldest first, with labels + findings', () => {
  const t = buildTimeline([lateShort('2026-06-10'), lateShort('2026-06-01')]);
  assert.equal(t[0].date, '2026-06-01');
  assert.equal(t[1].date, '2026-06-10');
  assert.ok(t[0].types.length >= 1);
  assert.ok(t[0].findings.some(f => /Late meal/i.test(f)));
});

// An interrupted lunch, attributable to someone.
const interrupted = (date, by) => createIncident({
  incidentDate: date, types: ['interrupted_meal'], clockIn: '09:00', clockOut: '17:30',
  meal: { start: '13:00', end: '13:30', interrupted: true, interruptedBy: by },
});

test('interruption rollup groups by who interrupted, biggest first', () => {
  const s = summarizePatterns([
    interrupted('2026-06-01', 'Manager — Smith'),
    interrupted('2026-06-02', 'Manager'),
    interrupted('2026-06-03', 'Customer'),
    lateShort('2026-06-04'),
  ]);
  assert.equal(s.interruptions.total, 3);
  assert.equal(s.interruptions.byActor[0].actor, 'Manager');
  assert.equal(s.interruptions.byActor[0].count, 2);
  assert.equal(s.interruptions.byActor[1].actor, 'Customer');
  assert.equal(s.interruptions.byActor[1].count, 1);
});

test('no interrupted lunches yields an empty rollup', () => {
  const s = summarizePatterns([lateShort('2026-06-01')]);
  assert.equal(s.interruptions.total, 0);
  assert.equal(s.interruptions.byActor.length, 0);
});

test('empty input yields zeroed summary', () => {
  const s = summarizePatterns([]);
  assert.equal(s.count, 0);
  assert.equal(s.issueRecords, 0);
  assert.equal(s.headline.length, 0);
  assert.equal(s.range.from, '');
});
