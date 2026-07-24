// Reporting-time pay (IWC Wage Orders §5) and necessary work expenses (Lab. Code §2802) —
// the two claims a California hourly worker meets most often that the catalog was missing.
// Facts only, as everywhere else: the app records the inputs and never computes what is owed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, summarize } from '../js/domain/breakRules.js';
import { createIncident } from '../js/domain/incidentModel.js';
import { contentHashOf, stampIntegrity, verifyIntegrity } from '../js/domain/integrity.js';
import { FINDING_LABELS } from '../js/rules/california.js';
import { TYPES_BY_ID, fieldsForTypes, FIELD } from '../js/config/infractionTypes.js';

const rec = (over = {}) => createIncident({ incidentDate: '2026-06-16', ...over });
const keys = (i) => Object.fromEntries(analyze(i).map(f => [f.key, f.value]));

// --- reporting-time pay ----------------------------------------------------

test('scheduled 8 hours, worked 2 — under half the shift is flagged', () => {
  const k = keys(rec({
    types: ['sent_home_early'], clockIn: '09:00', clockOut: '11:00',
    schedule: { scheduledStart: '09:00', scheduledEnd: '17:00' },
  }));
  assert.equal(k.reportingTimeShort, 2);
});

test('the note names the rule and refuses to compute the money', () => {
  const flag = analyze(rec({
    types: ['sent_home_early'], clockIn: '09:00', clockOut: '11:00',
    schedule: { scheduledStart: '09:00', scheduledEnd: '17:00' },
  })).find(f => f.key === 'reportingTimeShort');
  assert.match(flag.note, /IWC Wage Orders §5/);
  assert.match(flag.note, /min 2h, max 4h/);
  assert.match(flag.note, /Not computed here/);
  assert.equal(/\$/.test(flag.note), false, 'no dollar figure may appear in a finding');
});

test('working more than half the scheduled shift is not flagged', () => {
  const k = keys(rec({
    types: ['sent_home_early'], clockIn: '09:00', clockOut: '14:00',
    schedule: { scheduledStart: '09:00', scheduledEnd: '17:00' },
  }));
  assert.equal(k.reportingTimeShort, undefined);
});

test('exactly half the scheduled shift is not flagged — the rule is "less than half"', () => {
  const k = keys(rec({
    types: ['sent_home_early'], clockIn: '09:00', clockOut: '13:00',
    schedule: { scheduledStart: '09:00', scheduledEnd: '17:00' },
  }));
  assert.equal(k.reportingTimeShort, undefined);
});

test('picking it without the times still records the report rather than nothing', () => {
  const k = keys(rec({ types: ['sent_home_early'] }));
  assert.equal(k.reportingTimeReported, true);
  assert.equal(k.reportingTimeShort, undefined);
});

test('a reason given is recorded, with the note that some reasons change the rule', () => {
  const flag = analyze(rec({
    types: ['sent_home_early'], clockIn: '09:00', clockOut: '11:00',
    schedule: { scheduledStart: '09:00', scheduledEnd: '17:00', reason: 'power was out' },
  })).find(f => f.key === 'reportingTimeReason');
  assert.equal(flag.value, 'power was out');
  assert.match(flag.note, /outside the employer’s control/);
});

test('the unpaid meal is netted out before the half-shift test', () => {
  // 09:00–14:00 is 5h clock, minus a 30-min unpaid lunch = 4.5h worked, against an 10h
  // schedule — under half, and only because the meal was subtracted.
  const k = keys(rec({
    types: ['sent_home_early'], clockIn: '09:00', clockOut: '14:00',
    meal: { start: '12:00', end: '12:30' },
    schedule: { scheduledStart: '09:00', scheduledEnd: '19:00' },
  }));
  assert.equal(k.reportingTimeShort, 4.5);
});

test('a record with no schedule and no pick produces no reporting-time noise', () => {
  const k = keys(rec({ types: ['missed_meal'], clockIn: '08:00', clockOut: '17:00' }));
  assert.equal(k.reportingTimeShort, undefined);
  assert.equal(k.reportingTimeReported, undefined);
});

// --- §2802 expenses --------------------------------------------------------

test('an unreimbursed work expense is flagged and cites §2802', () => {
  const flag = analyze(rec({
    types: ['expense_unpaid'],
    expense: { item: 'work boots', amount: '$84.19', reimbursed: false },
  })).find(f => f.key === 'expenseUnreimbursed');
  assert.equal(flag.value, 'work boots');
  assert.match(flag.note, /§2802/);
  assert.match(flag.note, /Amount not computed here/);
});

test('a reimbursed expense produces no finding', () => {
  const k = keys(rec({ types: ['expense_unpaid'], expense: { item: 'boots', reimbursed: true } }));
  assert.equal(k.expenseUnreimbursed, undefined);
  assert.equal(k.expenseReported, undefined);
});

test('an expense with the answer still unknown is reported, not judged', () => {
  const k = keys(rec({ types: ['expense_unpaid'], expense: { item: 'phone plan' } }));
  assert.equal(k.expenseReported, 'phone plan');
  assert.equal(k.expenseUnreimbursed, undefined);
});

test('asking and being refused is its own recorded fact', () => {
  const flag = analyze(rec({
    types: ['expense_unpaid'],
    expense: { item: 'gas', askedOn: '2026-06-20', reimbursed: false },
  })).find(f => f.key === 'expenseAskedRefused');
  assert.equal(flag.value, '2026-06-20');
  assert.match(flag.note, /§2802/);
});

// --- wiring ----------------------------------------------------------------

test('both new types are in the catalog, cited, and ask for the right fields', () => {
  assert.deepEqual(fieldsForTypes(['sent_home_early']).sort(), [FIELD.CLOCK, FIELD.SCHEDULE].sort());
  assert.deepEqual(fieldsForTypes(['expense_unpaid']), [FIELD.EXPENSE]);
  assert.match(TYPES_BY_ID.sent_home_early.legal, /IWC Wage Orders §5/);
  assert.match(TYPES_BY_ID.expense_unpaid.legal, /§2802/);
});

test('the new issues are labelled, and their supporting details deliberately are not', () => {
  // A label is what makes a flag COUNT in the pattern roll-up. Counting the reason someone
  // was sent home, or the fact that they asked for their money back, as separate issues
  // would overstate the record — one incident, one count.
  for (const key of ['reportingTimeShort', 'reportingTimeReported', 'expenseUnreimbursed', 'expenseReported']) {
    assert.ok(FINDING_LABELS[key], `${key} is an issue and needs a label`);
    assert.equal(/§|IWC|Lab\./.test(FINDING_LABELS[key]), false, `${key}'s label should be plain, not a citation`);
  }
  for (const key of ['reportingTimeReason', 'expenseAskedRefused']) {
    assert.equal(FINDING_LABELS[key], undefined, `${key} is supporting detail and must not be counted as its own issue`);
  }
});

test('one incident produces one counted issue, not one per supporting fact', async () => {
  const { summarizePatterns } = await import('../js/domain/patterns.js');
  const s = summarizePatterns([
    rec({ types: ['sent_home_early'], clockIn: '09:00', clockOut: '10:30',
      schedule: { scheduledStart: '09:00', scheduledEnd: '17:00', reason: 'slow' } }),
    rec({ types: ['expense_unpaid'],
      expense: { item: 'boots', reimbursed: false, askedOn: '2026-06-20' } }),
  ]);
  assert.deepEqual(s.headline.map(h => h.key), ['reportingTimeShort', 'expenseUnreimbursed']);
  assert.deepEqual(s.headline.map(h => h.count), [1, 1]);
});

test('the glance summary names them in words a person would use', () => {
  const short = summarize(analyze(rec({
    types: ['sent_home_early'], clockIn: '09:00', clockOut: '11:00',
    schedule: { scheduledStart: '09:00', scheduledEnd: '17:00' },
  })));
  assert.ok(short.includes('Sent home early'));
  const exp = summarize(analyze(rec({ types: ['expense_unpaid'], expense: { item: 'boots', reimbursed: false } })));
  assert.ok(exp.includes('Work expense not paid back'));
});

// --- the seal contract holds across this schema growth ---------------------

test('the new fields are sealed evidence — changing one after sealing is caught', async () => {
  const sealed = await stampIntegrity(rec({
    types: ['sent_home_early', 'expense_unpaid'], clockIn: '09:00', clockOut: '11:00',
    schedule: { scheduledStart: '09:00', scheduledEnd: '17:00' },
    expense: { item: 'work boots', amount: '$84.19', reimbursed: false },
  }));
  assert.equal((await verifyIntegrity(sealed)).ok, true);

  for (const tamper of [
    { schedule: { ...sealed.schedule, scheduledEnd: '12:00' } },
    { expense: { ...sealed.expense, reimbursed: true } },
    { expense: { ...sealed.expense, amount: '$8.41' } },
  ]) {
    assert.equal((await verifyIntegrity({ ...sealed, ...tamper })).contentOk, false,
      `tampering with ${Object.keys(tamper)[0]} went undetected`);
  }
});

test('a record that predates these fields hashes the same as it always did', async () => {
  // The whole point of the pruned v2 view: adding empty-defaulted fields is invisible to it.
  const before = await contentHashOf({
    createdAt: '2026-06-16T15:04:05.000Z', capturedTz: 'America/Los_Angeles',
    incidentDate: '2026-06-16', workplace: 'Store #12', clockIn: '08:00', clockOut: '17:00',
    types: ['missed_meal'],
  }, 2);
  const after = await contentHashOf({
    createdAt: '2026-06-16T15:04:05.000Z', capturedTz: 'America/Los_Angeles',
    incidentDate: '2026-06-16', workplace: 'Store #12', clockIn: '08:00', clockOut: '17:00',
    types: ['missed_meal'],
    schedule: { scheduledStart: '', scheduledEnd: '', sentHomeBy: '', reason: '' },
    expense: { item: '', amount: '', paidOn: '', askedOn: '', reimbursed: null, response: '' },
  }, 2);
  assert.equal(after, before);
});
