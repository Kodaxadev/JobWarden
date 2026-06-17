// patterns.js — aggregate analysis across many records. One concern: turning a set of
// incidents into FACTS and COUNTS (never dollar amounts, never a verdict). Pure; no DOM.
// This is the "pattern / timeline" layer: per-incident findings already exist in
// breakRules; this rolls them up so a recurring problem becomes visible at a glance.
import { labelFor } from '../config/infractionTypes.js';
import { summarize } from './breakRules.js';
import { formatDate } from './timeUtils.js';

// Finding flag keys that represent a possible problem, with plain-language labels.
// (Informational flags like hoursWorked / mealsRequired / exemptCaveat are excluded.)
export const FINDING_LABELS = {
  lateMeal: 'Late lunch',
  missedMeal: 'No lunch',
  shortMeal: 'Short lunch (under 30 min)',
  interruptedMeal: 'Lunch interrupted',
  secondMealMissed: 'No second lunch (long shift)',
  secondMealLate: 'Late second lunch',
  secondMealShort: 'Short second lunch',
  firstMealWaiverInvalid: 'Lunch skip not allowed on that shift',
  secondMealWaiverInvalid: 'Second-lunch skip not allowed',
  restShortfall: 'Missed rest break',
  restInterrupted: 'Rest break interrupted',
  restOnCall: 'Rest break kept on-call',
  timeRecordEdited: 'Employer changed the time record',
};
const FINDING_KEYS = Object.keys(FINDING_LABELS);

const parseDay = d => (d ? Date.parse(d + 'T00:00:00Z') : NaN);

function spanLabel(days) {
  if (!days || days <= 1) return '1 day';
  if (days < 14) return `${days} days`;
  return `${Math.round(days / 7)} weeks`;
}

export function dateRange(incidents = []) {
  const dates = incidents.map(i => i.incidentDate).filter(Boolean).sort();
  const from = dates[0] || '';
  const to = dates[dates.length - 1] || '';
  const days = (from && to) ? Math.round((parseDay(to) - parseDay(from)) / 86400000) + 1 : 0;
  return { from, to, days, span: spanLabel(days) };
}

const hasFlag = (i, key) => (i.flags || []).some(f => f.key === key);
const flagValue = (i, key) => (i.flags || []).find(f => f.key === key)?.value;
const isReported = i => !!(i.notice && i.notice.to) || (i.types || []).includes('complaint_raised');

// Roll a set of incidents up into counts. Excludes soft-deleted records by contract:
// callers pass the active list (getAllIncidents already filters deleted).
export function summarizePatterns(incidents = []) {
  const findings = Object.fromEntries(FINDING_KEYS.map(k => [k, 0]));
  let offClockRecords = 0, offClockMinutes = 0, issueRecords = 0;
  const typeCounts = {}, workplaceCounts = {};

  for (const i of incidents) {
    let hasIssue = false;
    for (const k of FINDING_KEYS) if (hasFlag(i, k)) { findings[k]++; hasIssue = true; }
    const oc = flagValue(i, 'offClockMinutes');
    if (oc != null) { offClockRecords++; offClockMinutes += Number(oc) || 0; hasIssue = true; }
    if (hasIssue) issueRecords++;
    for (const t of (i.types || [])) typeCounts[t] = (typeCounts[t] || 0) + 1;
    if (i.workplace) workplaceCounts[i.workplace] = (workplaceCounts[i.workplace] || 0) + 1;
  }

  const byType = Object.entries(typeCounts)
    .map(([id, count]) => ({ id, label: labelFor(id), count }))
    .sort((a, b) => b.count - a.count);
  const byWorkplace = Object.entries(workplaceCounts)
    .map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  // Headline = the finding counts that are non-zero, biggest first.
  const headline = FINDING_KEYS
    .filter(k => findings[k] > 0)
    .map(k => ({ key: k, label: FINDING_LABELS[k], count: findings[k] }))
    .sort((a, b) => b.count - a.count);

  return {
    count: incidents.length,
    issueRecords,
    range: dateRange(incidents),
    findings,
    headline,
    offClock: { records: offClockRecords, totalMinutes: offClockMinutes },
    reportedCount: incidents.filter(isReported).length,
    withProofCount: incidents.filter(i => (i.attachments || []).length > 0).length,
    byType,
    byWorkplace,
  };
}

// Chronological case timeline (oldest first) — one compact row per record.
export function buildTimeline(incidents = []) {
  return [...incidents]
    .sort((a, b) =>
      (a.incidentDate || '').localeCompare(b.incidentDate || '') ||
      (a.createdAt || '').localeCompare(b.createdAt || ''))
    .map(i => ({
      date: i.incidentDate,
      dateLabel: formatDate(i.incidentDate),
      workplace: i.workplace || '',
      types: (i.types || []).map(labelFor),
      findings: summarize(i.flags || []),
    }));
}
