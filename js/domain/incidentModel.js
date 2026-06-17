// incidentModel.js — incident schema, factory, validation, edit-diffing, soft-delete.
// One concern: the record shape and its integrity. createdAt is immutable; edits append
// field-level old->new diffs; deletes are recoverable (soft) so nothing is silently destroyed.
import { nowIso, localTimezone } from './timeUtils.js';
import { analyze } from './breakRules.js';

export const SCHEMA_VERSION = 2;

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function normMeal(m = {}) {
  return {
    start: m.start || '', end: m.end || '',
    interrupted: !!m.interrupted, interruptedBy: m.interruptedBy || '', detail: m.detail || '',
    relievedOfDuty: m.relievedOfDuty ?? null, taken: m.taken ?? null, waived: !!m.waived,
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
  return { to: n.to || '', channel: n.channel || '', response: n.response || '' };
}
function normClassification(c = {}) {
  return { payType: c.payType || '' };
}

export function createIncident(input = {}) {
  const i = {
    id: input.id || uuid(),
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowIso(),
    capturedTz: localTimezone(),
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
    witnesses: input.witnesses || '',
    narrative: input.narrative || '',
    attachments: input.attachments || [],
    deleted: false, deletedAt: '', deleteReason: '',
    editLog: [],
  };
  i.flags = analyze(i);
  return i;
}

export function hydrateIncident(stored = {}) {
  const i = {
    id: stored.id || uuid(),
    schemaVersion: SCHEMA_VERSION,
    createdAt: stored.createdAt || nowIso(),
    capturedTz: stored.capturedTz || localTimezone(),
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
    witnesses: stored.witnesses || '',
    narrative: stored.narrative || '',
    attachments: stored.attachments || [],
    deleted: !!stored.deleted,
    deletedAt: stored.deletedAt || '',
    deleteReason: stored.deleteReason || '',
    editLog: Array.isArray(stored.editLog) ? [...stored.editLog] : [],
  };
  i.flags = analyze(i);
  return i;
}

const TRACKED = [
  'incidentDate', 'workplace', 'clockIn', 'clockOut', 'types',
  'meal.start', 'meal.end', 'meal.interrupted', 'meal.interruptedBy', 'meal.detail', 'meal.relievedOfDuty', 'meal.taken', 'meal.waived',
  'meal2.start', 'meal2.end', 'meal2.taken', 'meal2.waived',
  'rest.taken', 'rest.interrupted', 'rest.onCall',
  'offClock.start', 'offClock.end', 'offClock.task', 'offClock.directedBy', 'offClock.knownBy', 'offClock.payPeriod', 'offClock.expectedPay', 'offClock.employerEdited',
  'notice.to', 'notice.channel', 'notice.response',
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
  };
  merged.id = existing.id;
  merged.createdAt = existing.createdAt;
  merged.schemaVersion = existing.schemaVersion;
  const fieldChanges = diffFields(existing, merged);
  merged.editLog = [...(existing.editLog || []), { at: nowIso(), note: changes._editNote || 'edited', changes: fieldChanges }];
  merged.flags = analyze(merged);
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
