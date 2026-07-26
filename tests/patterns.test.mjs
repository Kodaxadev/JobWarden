import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarizePatterns, buildTimeline, dateRange } from '../js/domain/patterns.js';
import { createIncident } from '../js/domain/incidentModel.js';
import { weeklyOvertimeCaveat } from '../js/config/disclaimers.js';

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

// --- the headline counts the high-stakes findings too (audit B1) -----------

test('retaliation and final-pay findings appear in the headline totals', () => {
  const retaliated = createIncident({
    incidentDate: '2026-06-11', types: ['retaliation'], notice: { to: 'HR', adverseAction: 'hours cut' },
  });
  const finalPay = createIncident({
    incidentDate: '2026-06-12', types: ['final_pay'],
    finalPay: { separation: 'fired', lastDay: '2026-06-01', datePaid: '2026-06-09', fullyPaid: false },
  });
  const s = summarizePatterns([retaliated, finalPay]);
  const keys = s.headline.map(h => h.key);
  assert.ok(keys.includes('retaliationNoted'));
  assert.ok(keys.includes('finalPayLate'));
  assert.ok(keys.includes('finalPayShort'));
  assert.equal(s.issueRecords, 2);
});

test('on-duty meal findings appear in the headline totals', () => {
  const onDuty = createIncident({
    incidentDate: '2026-06-13', types: ['interrupted_meal'], clockIn: '08:00', clockOut: '16:30',
    meal: { start: '12:00', end: '12:30', interrupted: true, writtenAgreement: 'no' },
  });
  const keys = summarizePatterns([onDuty]).headline.map(h => h.key);
  assert.ok(keys.includes('interruptedMeal'));
  assert.ok(keys.includes('onDutyNoAgreement'));
});

// --- weekly overtime roll-up (audit §2) ------------------------------------

import { weeklyOvertime } from '../js/domain/patterns.js';

test('weekly overtime surfaces a >40h week that no single day shows', () => {
  // Seven 7-hour days in one Sun–Sat week = 49h worked, 9h over 40.
  const days = ['2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13']
    .map(d => createIncident({ incidentDate: d, types: ['off_clock_work'], clockIn: '09:00', clockOut: '16:00' }));
  const ot = weeklyOvertime(days);
  assert.equal(ot.count, 1);
  assert.equal(ot.totalOtHours, 9);
  assert.equal(ot.weeks[0].hours, 49);
});

test('a 40-hour week is not flagged', () => {
  const days = ['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12']
    .map(d => createIncident({ incidentDate: d, types: ['off_clock_work'], clockIn: '09:00', clockOut: '17:00' })); // 8h each = 40
  assert.equal(weeklyOvertime(days).count, 0);
});

test('summarizePatterns includes the weekly-overtime roll-up', () => {
  const week = ['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13']
    .map(d => createIncident({ incidentDate: d, types: ['off_clock_work'], clockIn: '08:00', clockOut: '16:00' })); // 6×8h = 48
  const s = summarizePatterns(week);
  assert.ok(s.weeklyOvertime);
  assert.equal(s.weeklyOvertime.count, 1);
  assert.equal(s.weeklyOvertime.totalOtHours, 8);
});

// Weekly hours are summed across every record in a Sunday–Saturday week, whatever workplace they
// came from. Overtime is owed per EMPLOYER, and holding two hourly jobs is ordinary in this
// audience — so 25 hours at one place plus 20 at another must not read as a 5-hour overtime week
// with nothing said about it. The roll-up names the workplaces it drew on.
test('an over-40 week says which workplaces it added together', () => {
  const day = (date, hours, workplace) => ({
    incidentDate: date, workplace, types: ['off_clock_work'],
    flags: [{ key: 'hoursWorked', value: hours }],
  });
  // Sunday 2026-06-14 through Saturday 2026-06-20: 25h at one place, 20h at another.
  const twoJobs = [
    day('2026-06-15', 12.5, 'Store #12'), day('2026-06-16', 12.5, 'Store #12'),
    day('2026-06-17', 10, 'Diner on 5th'), day('2026-06-18', 10, 'Diner on 5th'),
  ];
  const mixed = weeklyOvertime(twoJobs);
  assert.equal(mixed.count, 1);
  assert.equal(mixed.weeks[0].hours, 45);
  assert.deepEqual(mixed.weeks[0].workplaces, ['Diner on 5th', 'Store #12']);
  assert.equal(mixed.mixedWeeks, 1, 'this is the week whose total could mislead');

  const oneJob = [day('2026-06-15', 22.5, 'Store #12'), day('2026-06-16', 22.5, 'Store #12')];
  const single = weeklyOvertime(oneJob);
  assert.equal(single.count, 1);
  assert.deepEqual(single.weeks[0].workplaces, ['Store #12']);
  assert.equal(single.mixedWeeks, 0, 'one employer needs no extra warning');
});

test('a record with no workplace does not invent one', () => {
  const nameless = weeklyOvertime([
    { incidentDate: '2026-06-15', workplace: '', flags: [{ key: 'hoursWorked', value: 21 }] },
    { incidentDate: '2026-06-16', workplace: '', flags: [{ key: 'hoursWorked', value: 21 }] },
  ]);
  assert.deepEqual(nameless.weeks[0].workplaces, []);
  assert.equal(nameless.mixedWeeks, 0);
});

test('the weekly caveat names the workweek basis always, and the second job only when there is one', () => {
  const plain = weeklyOvertimeCaveat({ mixedWeeks: 0 });
  assert.match(plain, /Sunday to Saturday/);
  assert.match(plain, /workweek may start on another day/);
  assert.doesNotMatch(plain, /more than one workplace/, 'do not warn about a job they do not have');

  const mixed = weeklyOvertimeCaveat({ mixedWeeks: 2 });
  assert.match(mixed, /Sunday to Saturday/);
  assert.match(mixed, /more than one workplace/);
  assert.match(mixed, /for each employer separately/);
  assert.equal(weeklyOvertimeCaveat(), plain, 'no argument is the safe default');
});

// Two surfaces print this number. They used to carry their own hand-written caveats, already
// worded differently — which is how the second sentence goes missing from one of them.
test('both surfaces take the caveat from the one place it is written', () => {
  for (const f of ['js/ui/incidentList.js', 'js/export/exportSummary.js']) {
    const src = readFileSync(f, 'utf8');
    assert.match(src, /weeklyOvertimeCaveat/, `${f} must use the shared caveat`);
    assert.doesNotMatch(src, /workweek may start on another day/, `${f} still hand-writes it`);
  }
});
