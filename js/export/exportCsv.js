// exportCsv.js — spreadsheet export (no photos). One concern: CSV export.
// buildCsv() is pure (unit-tested). Cells are CSV-escaped AND neutralized against
// spreadsheet formula injection — CWE-1236 / OWASP CSV injection.
import { summarize } from '../domain/breakRules.js';
import { labelFor } from '../config/infractionTypes.js';
import { downloadText, dateStamp } from './download.js';

const HEADER = [
  'Date', 'Workplace', 'Issues', 'Pay type', 'Clock in', 'Clock out', 'Hours worked',
  'Lunch start', 'Lunch end', '1st meal waived', 'Interrupted', 'Interrupted by', 'Relieved of duty',
  '2nd meal start', '2nd meal end', '2nd meal waived', 'Rest taken', 'Rest required',
  'Off-clock start', 'Off-clock end', 'Off-clock task', 'Directed by', 'Time record edited', 'Pay period', 'Expected pay',
  'Findings', 'Reported to', 'Channel', 'Witnesses', 'Narrative', 'Location', 'Photos', 'Edits', 'Logged at',
];

// Escape for CSV syntax AND defang leading formula triggers (= + - @ tab CR).
export function cell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const flag = (flags, key) => (flags || []).find(f => f.key === key)?.value ?? '';
const tri = v => (v === true ? 'Yes' : v === false ? 'No' : '');

export function buildCsv(incidents) {
  const rows = incidents.map(i => [
    i.incidentDate, i.workplace, (i.types || []).map(labelFor).join('; '), i.classification?.payType,
    i.clockIn, i.clockOut, flag(i.flags, 'hoursWorked'),
    i.meal?.start, i.meal?.end, tri(i.meal?.waived), tri(i.meal?.interrupted), i.meal?.interruptedBy, tri(i.meal?.relievedOfDuty),
    i.meal2?.start, i.meal2?.end, tri(i.meal2?.waived),
    i.rest?.taken ?? '', flag(i.flags, 'restRequired'),
    i.offClock?.start, i.offClock?.end, i.offClock?.task, i.offClock?.directedBy, tri(i.offClock?.employerEdited), i.offClock?.payPeriod, i.offClock?.expectedPay,
    summarize(i.flags).join(' / '),
    i.notice?.to, i.notice?.channel, i.witnesses, i.narrative,
    i.location ? `${i.location.lat},${i.location.lng}` : '',
    (i.attachments || []).length, (i.editLog || []).length, i.createdAt,
  ].map(cell).join(','));
  return [HEADER.map(cell).join(','), ...rows].join('\r\n');
}

export function exportCsv(incidents) {
  downloadText(`jobwarden-export-${dateStamp()}.csv`, buildCsv(incidents), 'text/csv');
  return incidents.length;
}
