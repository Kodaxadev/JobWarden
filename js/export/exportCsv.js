// exportCsv.js — spreadsheet export (no photos). One concern: CSV export.
// buildCsv() is pure (unit-tested). Cells are CSV-escaped AND neutralized against
// spreadsheet formula injection — CWE-1236 / OWASP CSV injection.
import { getRules } from '../rules/index.js';
import { labelFor } from '../config/infractionTypes.js';
import { downloadText, dateStamp } from './download.js';
import { CSV_PREAMBLE } from '../config/disclaimers.js';
import { payStatusLabel } from '../config/payStatus.js';
import { payStubIssueLabel, tipProblemLabel, sickActionLabel } from '../config/payIssueOptions.js';

const HEADER = [
  'Date', 'Workplace', 'Issues', 'Pay type', 'Clock in', 'Clock out', 'Hours worked',
  'Lunch start', 'Lunch end', '1st meal waived', 'Interrupted', 'Interrupted by', 'Relieved of duty',
  '2nd meal start', '2nd meal end', '2nd meal waived', 'Rest taken', 'Rest required',
  'Off-clock start', 'Off-clock end', 'Off-clock task', 'Directed by', 'Time record edited', 'Pay period', 'Expected pay',
  'Split first start', 'Split first end', 'Split second start', 'Split second end', 'Employer set gap', 'Lives at work', 'Split pay shown',
  'Pay-stub period start', 'Pay-stub period end', 'Pay-stub concerns', 'Pay-stub detail', 'Copy requested', 'Copy received',
  'Tip problem', 'Tip date', 'Tip amount recorded', 'Tips handled by', 'Asked about tips', 'Tip response',
  'Sick leave requested', 'Employer action date', 'Action after request', 'Sick time available', 'Request made to', 'Request channel', 'Employer response',
  'Possible issues (pointers, not determinations)', 'Reported to', 'Channel', 'Witnesses', 'Narrative', 'Location', 'Photos', 'Edits', 'Logged at',
];

// Escape for CSV syntax AND defang leading formula triggers (= + - @ tab CR).
export function cell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const flag = (flags, key) => (flags || []).find(f => f.key === key)?.value ?? '';
const tri = v => (v === true ? 'Yes' : v === false ? 'No' : '');

// A spreadsheet gets forwarded, and a column of "possible issues" reads like a table of
// findings to whoever opens it next. The note rows lead the file, where Excel and Sheets
// both show them plainly, and the header stays a single row so the data below it is still
// a clean dataset (skip the first rows to parse). Every cell still goes through cell().
export function buildCsv(incidents, { preamble = true } = {}) {
  const rows = incidents.map(i => [
    i.incidentDate, i.workplace, (i.types || []).map(labelFor).join('; '),
    i.classification?.payType ? payStatusLabel(i.classification.payType) : '',
    i.clockIn, i.clockOut, flag(i.flags, 'hoursWorked'),
    i.meal?.start, i.meal?.end, tri(i.meal?.waived), tri(i.meal?.interrupted), i.meal?.interruptedBy, tri(i.meal?.relievedOfDuty),
    i.meal2?.start, i.meal2?.end, tri(i.meal2?.waived),
    i.rest?.taken ?? '', flag(i.flags, 'restRequired'),
    i.offClock?.start, i.offClock?.end, i.offClock?.task, i.offClock?.directedBy, tri(i.offClock?.employerEdited), i.offClock?.payPeriod, i.offClock?.expectedPay,
    i.splitShift?.firstStart, i.splitShift?.firstEnd, i.splitShift?.secondStart, i.splitShift?.secondEnd,
    tri(i.splitShift?.employerSet), tri(i.splitShift?.livesAtWork), tri(i.splitShift?.premiumPaid),
    i.payStub?.periodStart, i.payStub?.periodEnd, (i.payStub?.issues || []).map(payStubIssueLabel).join('; '),
    i.payStub?.detail, i.payStub?.requestedOn, i.payStub?.receivedOn,
    i.tips?.problem ? tipProblemLabel(i.tips.problem) : '', i.tips?.date, i.tips?.amount, i.tips?.by, i.tips?.askedOn, i.tips?.response,
    i.sickLeave?.requestDate, i.sickLeave?.actionDate,
    i.sickLeave?.action ? sickActionLabel(i.sickLeave.action) : '', tri(i.sickLeave?.available),
    i.sickLeave?.told, i.sickLeave?.channel, i.sickLeave?.response,
    getRules(i.jurisdiction).summarize(i.flags).join(' / '),
    i.notice?.to, i.notice?.channel, i.witnesses, i.narrative,
    i.location ? `${i.location.lat},${i.location.lng}` : '',
    (i.attachments || []).length, (i.editLog || []).length, i.createdAt,
  ].map(cell).join(','));
  const notes = preamble ? [...CSV_PREAMBLE.map(cell), ''] : [];
  return [...notes, HEADER.map(cell).join(','), ...rows].join('\r\n');
}

export function exportCsv(incidents) {
  downloadText(`jobwarden-export-${dateStamp()}.csv`, buildCsv(incidents), 'text/csv');
  return incidents.length;
}
