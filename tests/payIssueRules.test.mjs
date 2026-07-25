import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../js/domain/breakRules.js';
import { createIncident, reviseIncident } from '../js/domain/incidentModel.js';
import { stampIntegrity, verifyIntegrity } from '../js/domain/integrity.js';
import { INFRACTION_TYPES, FIELD } from '../js/config/infractionTypes.js';
import { buildCsv } from '../js/export/exportCsv.js';
import { buildReportHtml } from '../js/export/exportReport.js';

const base = (over = {}) => ({
  incidentDate: '2026-07-01', types: [], classification: { payType: 'hourly' },
  meal: {}, meal2: {}, rest: {}, offClock: {}, ...over,
});
const flags = (incident, asOfDate = '2026-07-25') =>
  Object.fromEntries(analyze(incident, { asOfDate }).map(item => [item.key, item.value]));

test('all four California pay issues are structured catalog entries', () => {
  const byId = Object.fromEntries(INFRACTION_TYPES.map(item => [item.id, item]));
  assert.deepEqual(byId.split_shift.fields, [FIELD.SPLIT]);
  assert.deepEqual(byId.pay_stub_problem.fields, [FIELD.PAYSTUB]);
  assert.deepEqual(byId.tips_problem.fields, [FIELD.TIPS]);
  assert.deepEqual(byId.sick_leave_problem.fields, [FIELD.SICK]);
});

test('an employer-set split shift with no displayed premium gets a cautious finding', () => {
  const result = flags(base({
    types: ['split_shift'],
    splitShift: {
      firstStart: '08:00', firstEnd: '12:00', secondStart: '17:00', secondEnd: '21:00',
      employerSet: true, livesAtWork: false, premiumPaid: false,
    },
  }));
  assert.equal(result.splitShiftPremiumMissing, true);
});

test('split-shift exceptions and unknown facts stay contextual', () => {
  assert.equal(flags(base({
    types: ['split_shift'], splitShift: { livesAtWork: true },
  })).splitShiftPremiumMissing, undefined);
  assert.equal(flags(base({
    types: ['split_shift'], splitShift: {},
  })).splitShiftReported, true);
});

test('pay-stub issues retain the selected §226 items', () => {
  const result = flags(base({
    types: ['pay_stub_problem'],
    payStub: { issues: ['hours', 'rates'], periodStart: '2026-06-01', periodEnd: '2026-06-15' },
  }));
  assert.deepEqual(result.payStubProblemReported, ['hours', 'rates']);
});

test('a pay-record copy request is not called overdue until after 21 days', () => {
  const incident = base({
    types: ['pay_stub_problem'],
    payStub: { issues: ['no_stub'], requestedOn: '2026-07-01', receivedOn: '' },
  });
  assert.equal(flags(incident, '2026-07-22').payStubCopyOverdue, undefined);
  assert.equal(flags(incident, '2026-07-23').payStubCopyOverdue, 22);
});

test('tip events map to factual §351 pointers without dollar math', () => {
  for (const problem of ['kept', 'fees', 'late_card', 'tip_credit', 'manager_pool']) {
    const incident = base({ types: ['tips_problem'], tips: { problem, amount: '$24.50' } });
    const finding = analyze(incident).find(item => item.key === 'tipsProblemReported');
    assert.equal(finding.value, problem);
    assert.equal(finding.note.includes('$24.50'), false);
    assert.match(finding.note, /§351|minimum-wage/);
  }
});

test('sick-leave action records availability without deciding retaliation', () => {
  const known = flags(base({
    types: ['sick_leave_problem'],
    sickLeave: { requestDate: '2026-07-01', actionDate: '2026-07-02', action: 'hours_cut', available: true },
  }));
  assert.equal(known.sickLeaveActionReported, 'hours_cut');

  const unavailable = flags(base({
    types: ['sick_leave_problem'],
    sickLeave: { action: 'denied', available: false },
  }));
  assert.equal(unavailable.sickLeaveActionReported, undefined);
  assert.equal(unavailable.sickLeaveContext, 'denied');
});

test('new pay fields normalize, survive edits, and appear in the edit log', () => {
  const original = createIncident({
    incidentDate: '2026-07-01', types: ['pay_stub_problem'],
    payStub: { issues: ['rates', 'hours', 'hours'], detail: 'rate changed' },
  });
  assert.deepEqual(original.payStub.issues, ['hours', 'rates']);
  const revised = reviseIncident(original, {
    payStub: { receivedOn: '2026-07-20' },
    tips: { problem: 'fees' },
  });
  const changed = revised.editLog.at(-1).changes.map(item => item.field);
  assert.ok(changed.includes('payStub.receivedOn'));
  assert.ok(changed.includes('tips.problem'));
});

test('new structured facts are sealed and tampering is detected', async () => {
  const sealed = await stampIntegrity(createIncident({
    incidentDate: '2026-07-01', types: ['tips_problem'],
    tips: { problem: 'kept', amount: '$24.50', by: 'Manager' },
  }));
  assert.equal((await verifyIntegrity(sealed)).ok, true);
  const changed = { ...sealed, tips: { ...sealed.tips, problem: 'other' } };
  assert.equal((await verifyIntegrity(changed)).contentOk, false);
});

test('spreadsheet and printable report carry the structured pay facts', async () => {
  const incident = createIncident({
    incidentDate: '2026-07-01',
    types: ['pay_stub_problem', 'sick_leave_problem'],
    payStub: { issues: ['hours'], requestedOn: '2026-07-02' },
    sickLeave: { requestDate: '2026-07-03', action: 'occurrence', available: true },
  });
  const csv = buildCsv([incident]);
  assert.match(csv, /Total hours are missing or look wrong/);
  assert.match(csv, /attendance point or occurrence/i);
  const report = await buildReportHtml([incident]);
  assert.match(report, /Pay-stub concerns/);
  assert.match(report, /Accrued sick time available/);
});
