// incidentModel.js — incident schema, factory, validation, edit-diffing, soft-delete.
// One concern: the record shape and its integrity. createdAt is immutable; edits append
// field-level old->new diffs; deletes are recoverable (soft) so nothing is silently destroyed.
import { nowIso, localTimezone } from './timeUtils.js';
import { getRules } from '../rules/index.js';

export const SCHEMA_VERSION = 3;

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function normMeal(m = {}) {
  return {
    start: m.start || '', end: m.end || '',
    interrupted: !!m.interrupted, interruptedBy: m.interruptedBy || '', detail: m.detail || '',
    onCall: !!m.onCall, relievedOfDuty: m.relievedOfDuty ?? null, taken: m.taken ?? null, waived: !!m.waived,
    writtenAgreement: m.writtenAgreement || '', // on-duty meal agreement: '' unknown | 'yes' | 'no'
  };
}
function normMeal2(m = {}) {
  return { start: m.start || '', end: m.end || '', taken: m.taken ?? null, waived: !!m.waived };
}
function normRest(r = {}) {
  return { taken: r.taken ?? null, interrupted: !!r.interrupted, onCall: !!r.onCall };
}
function normOffClock(o = {}) {
  return {
    start: o.start || '', end: o.end || '', task: o.task || '',
    directedBy: o.directedBy || '', knownBy: o.knownBy || '',
    payPeriod: o.payPeriod || '', expectedPay: o.expectedPay || '',
    employerEdited: o.employerEdited ?? null,
  };
}
function normNotice(n = {}) {
  return { to: n.to || '', channel: n.channel || '', response: n.response || '', adverseAction: n.adverseAction || '' };
}
function normClassification(c = {}) {
  return { payType: c.payType || '', awsElection: c.awsElection || '', cbaCovered: c.cbaCovered || '' };
}
// Reporting-time pay (IWC §5): what the shift was scheduled to be, vs. what was worked.
// Every default is '' or null — never false — so records sealed before this field existed
// keep verifying (see integrity.js and tests/sealContract.test.mjs).
function normSchedule(s = {}) {
  return { scheduledStart: s.scheduledStart || '', scheduledEnd: s.scheduledEnd || '', sentHomeBy: s.sentHomeBy || '', reason: s.reason || '' };
}
// Necessary work expenses (§2802). `amount` is the user's own number, kept as a string —
// the app records what they paid and never computes what is owed.
function normExpense(e = {}) {
  return { item: e.item || '', amount: e.amount || '', paidOn: e.paidOn || '', askedOn: e.askedOn || '', reimbursed: e.reimbursed ?? null, response: e.response || '' };
}
function normFinalPay(p = {}) {
  // separation: '' | 'fired' | 'quit_notice' | 'quit_no_notice'; dates 'YYYY-MM-DD'; fullyPaid tri.
  return { separation: p.separation || '', lastDay: p.lastDay || '', datePaid: p.datePaid || '', fullyPaid: p.fullyPaid ?? null };
}

export function createIncident(input = {}) {
  const i = {
    id: input.id || uuid(),
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowIso(),
    capturedTz: localTimezone(),
    jurisdiction: input.jurisdiction || 'CA',   // which state's rules apply (analysis metadata, not sealed content)
    incidentDate: input.incidentDate || '',
    workplace: input.workplace || '',
    location: input.location || null,
    clockIn: input.clockIn || '',
    clockOut: input.clockOut || '',
    types: Array.isArray(input.types) ? [...input.types] : [],
    classification: normClassification(input.classification),
    meal: normMeal(input.meal),
    meal2: normMeal2(input.meal2),
    rest: normRest(input.rest),
    offClock: normOffClock(input.offClock),
    notice: normNotice(input.notice),
    finalPay: normFinalPay(input.finalPay),
    schedule: normSchedule(input.schedule),
    expense: normExpense(input.expense),
    witnesses: input.witnesses || '',
    narrative: input.narrative || '',
    attachments: input.attachments || [],
    deleted: false, deletedAt: '', deleteReason: '',
    editLog: [],
    contentHash: '', recordHash: '', sealedAt: '', sealVersion: 0, // set by the repo when persisted (see integrity.js)
  };
  i.flags = getRules(i.jurisdiction).analyze(i);
  return i;
}

export function hydrateIncident(stored = {}) {
  const i = {
    id: stored.id || uuid(),
    schemaVersion: SCHEMA_VERSION,
    createdAt: stored.createdAt || nowIso(),
    capturedTz: stored.capturedTz || localTimezone(),
    jurisdiction: stored.jurisdiction || 'CA',
    incidentDate: stored.incidentDate || '',
    workplace: stored.workplace || '',
    location: stored.location || null,
    clockIn: stored.clockIn || '',
    clockOut: stored.clockOut || '',
    types: Array.isArray(stored.types) ? [...stored.types] : [],
    classification: normClassification(stored.classification),
    meal: normMeal(stored.meal),
    meal2: normMeal2(stored.meal2),
    rest: normRest(stored.rest),
    offClock: normOffClock(stored.offClock),
    notice: normNotice(stored.notice),
    finalPay: normFinalPay(stored.finalPay),
    schedule: normSchedule(stored.schedule),
    expense: normExpense(stored.expense),
    witnesses: stored.witnesses || '',
    narrative: stored.narrative || '',
    attachments: stored.attachments || [],
    deleted: !!stored.deleted,
    deletedAt: stored.deletedAt || '',
    deleteReason: stored.deleteReason || '',
    editLog: Array.isArray(stored.editLog) ? [...stored.editLog] : [],
    contentHash: stored.contentHash || '', recordHash: stored.recordHash || '', sealedAt: stored.sealedAt || '',
    sealVersion: stored.sealVersion || 0,
  };
  i.flags = getRules(i.jurisdiction).analyze(i);
  return i;
}

const TRACKED = [
  'incidentDate', 'workplace', 'clockIn', 'clockOut', 'types',
  'meal.start', 'meal.end', 'meal.interrupted', 'meal.interruptedBy', 'meal.detail', 'meal.onCall', 'meal.relievedOfDuty', 'meal.taken', 'meal.waived', 'meal.writtenAgreement',
  'meal2.start', 'meal2.end', 'meal2.taken', 'meal2.waived',
  'rest.taken', 'rest.interrupted', 'rest.onCall',
  'offClock.start', 'offClock.end', 'offClock.task', 'offClock.directedBy', 'offClock.knownBy', 'offClock.payPeriod', 'offClock.expectedPay', 'offClock.employerEdited',
  'notice.to', 'notice.channel', 'notice.response', 'notice.adverseAction',
  'finalPay.separation', 'finalPay.lastDay', 'finalPay.datePaid', 'finalPay.fullyPaid',
  'schedule.scheduledStart', 'schedule.scheduledEnd', 'schedule.sentHomeBy', 'schedule.reason',
  'expense.item', 'expense.amount', 'expense.paidOn', 'expense.askedOn', 'expense.reimbursed', 'expense.response',
  'witnesses', 'narrative',
];
const getPath = (o, p) => p.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), o);
const norm = v => (Array.isArray(v) ? v.join('|') : v == null ? '' : String(v));

function diffFields(a, b) {
  const changes = [];
  for (const p of TRACKED) {
    if (norm(getPath(a, p)) !== norm(getPath(b, p))) {
      changes.push({ field: p, from: getPath(a, p) ?? '', to: getPath(b, p) ?? '' });
    }
  }
  return changes;
}

export function reviseIncident(existing, changes = {}) {
  const merged = {
    ...existing,
    incidentDate: changes.incidentDate ?? existing.incidentDate,
    workplace: changes.workplace ?? existing.workplace,
    location: changes.location ?? existing.location,
    clockIn: changes.clockIn ?? existing.clockIn,
    clockOut: changes.clockOut ?? existing.clockOut,
    types: changes.types ? [...changes.types] : existing.types,
    witnesses: changes.witnesses ?? existing.witnesses,
    narrative: changes.narrative ?? existing.narrative,
    attachments: changes.attachments ?? existing.attachments,
    classification: normClassification({ ...existing.classification, ...(changes.classification || {}) }),
    meal: normMeal({ ...existing.meal, ...(changes.meal || {}) }),
    meal2: normMeal2({ ...existing.meal2, ...(changes.meal2 || {}) }),
    rest: normRest({ ...existing.rest, ...(changes.rest || {}) }),
    offClock: normOffClock({ ...existing.offClock, ...(changes.offClock || {}) }),
    notice: normNotice({ ...existing.notice, ...(changes.notice || {}) }),
    finalPay: normFinalPay({ ...existing.finalPay, ...(changes.finalPay || {}) }),
    schedule: normSchedule({ ...existing.schedule, ...(changes.schedule || {}) }),
    expense: normExpense({ ...existing.expense, ...(changes.expense || {}) }),
  };
  merged.id = existing.id;
  merged.createdAt = existing.createdAt;
  merged.schemaVersion = existing.schemaVersion;
  const fieldChanges = diffFields(existing, merged);
  merged.editLog = [...(existing.editLog || []), { at: nowIso(), note: changes._editNote || 'edited', changes: fieldChanges }];
  merged.flags = getRules(merged.jurisdiction).analyze(merged);
  return merged;
}

export function softDelete(existing, reason = '') {
  return {
    ...existing, deleted: true, deletedAt: nowIso(), deleteReason: reason,
    editLog: [...(existing.editLog || []), { at: nowIso(), note: 'deleted', changes: [{ field: 'deleted', from: false, to: true }] }],
  };
}

export function restoreIncident(existing) {
  return {
    ...existing, deleted: false, deletedAt: '',
    editLog: [...(existing.editLog || []), { at: nowIso(), note: 'restored', changes: [{ field: 'deleted', from: true, to: false }] }],
  };
}

export function validateIncident(i) {
  const errors = [];
  if (!i.incidentDate) errors.push('Date is required.');
  if (!i.types || i.types.length === 0) errors.push('Pick at least one issue type.');
  return { valid: errors.length === 0, errors };
}

const _mins = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
// Overnight-aware span: if end is at/before start, assume it crossed midnight (+24h).
const _span = (a, b) => { if (a == null || b == null) return null; let d = b - a; if (d <= 0) d += 1440; return d; };

// Non-blocking sanity checks — likely-typo signals, NOT validation. The app records facts, so
// these never block a save; the capture screen asks "save anyway?" so a real (if unusual) shift
// still goes in, and a fat-fingered time gets a chance to be fixed. Convention: incidentDate is
// the date the shift STARTED (an overnight shift ending after midnight keeps its clock-in date).
export function sanityWarnings(i = {}) {
  const w = [];
  const ci = _mins(i.clockIn), co = _mins(i.clockOut);
  const span = _span(ci, co);
  if (span != null && span > 16 * 60) w.push('This shift is longer than 16 hours — double-check the start and end times.');
  const mlen = _span(_mins(i.meal?.start), _mins(i.meal?.end));
  if (mlen != null && mlen > 4 * 60) w.push('This lunch is longer than 4 hours — double-check the lunch times.');
  if (i.incidentDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(String(i.incidentDate) + 'T00:00:00');
    if (!Number.isNaN(d.getTime()) && d.getTime() > today.getTime()) w.push('This date is in the future.');
  }
  return w;
}
