// patterns.js — aggregate analysis across many records. One concern: turning a set of
// incidents into FACTS and COUNTS (never dollar amounts, never a verdict). Pure; no DOM.
// This is the "pattern / timeline" layer: per-incident findings already exist in
// breakRules; this rolls them up so a recurring problem becomes visible at a glance.
import { labelFor } from '../config/infractionTypes.js';
import { getRules, findingLabels } from '../rules/index.js';
import { formatDate } from './timeUtils.js';

// Finding flag keys that represent a possible problem, with plain-language labels —
// merged from every rule set (each state names and labels its own finding keys).
// Informational flags (hoursWorked / mealsRequired / the caveats) carry no label and
// are excluded. offClockMinutes is totaled separately below (minutes, not a count).
export const FINDING_LABELS = findingLabels();
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

// Sunday-anchored week key for a 'YYYY-MM-DD' date (local).
function weekStartOf(dateStr) {
  const d = new Date(String(dateStr) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - d.getDay());   // back to Sunday
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Weekly overtime: sum hours WORKED into Sun–Sat weeks and surface weeks over 40. This is the
// cross-record view a single day can't show (seven 7-hour days is 49h). Hours are facts already
// computed per record; summing them is arithmetic, not damage math — never dollars. The employer's
// official workweek may start on another day, so the Sun–Sat basis is disclosed as a caveat.
// Weekly hours are also summed regardless of WHERE they were worked, and overtime is owed per
// employer, not per person. Hourly workers holding two jobs are common in exactly this audience,
// and 25h at one place plus 20h at another is not a 5-hour overtime week. So each week reports
// the workplaces that fed it, and `mixedWeeks` counts the ones drawing on more than one — the
// case where the total is most likely to mislead. Splitting the buckets by workplace instead
// would be its own error: one employer often has several sites.
export function weeklyOvertime(incidents = []) {
  const byWeek = {};
  for (const i of incidents) {
    const hv = (i.flags || []).find(f => f.key === 'hoursWorked')?.value;
    if (hv == null || !i.incidentDate) continue;
    const k = weekStartOf(i.incidentDate);
    if (!k) continue;
    const week = byWeek[k] || (byWeek[k] = { hours: 0, places: new Set() });
    week.hours += Number(hv);
    if (i.workplace) week.places.add(i.workplace);
  }
  const round2 = n => Math.round(n * 100) / 100;
  const weeks = Object.entries(byWeek)
    .map(([weekStart, w]) => ({
      weekStart,
      hours: round2(w.hours),
      overtime: round2(Math.max(0, w.hours - 40)),
      workplaces: [...w.places].sort(),
    }))
    .filter(w => w.overtime > 0)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  return {
    weeks,
    count: weeks.length,
    totalOtHours: round2(weeks.reduce((s, w) => s + w.overtime, 0)),
    mixedWeeks: weeks.filter(w => w.workplaces.length > 1).length,
  };
}

const hasFlag = (i, key) => (i.flags || []).some(f => f.key === key);
const flagValue = (i, key) => (i.flags || []).find(f => f.key === key)?.value;
const isReported = i => !!(i.notice && i.notice.to) || (i.types || []).includes('complaint_raised');

// Who interrupted the meal, normalized so the structured quick-capture categories and
// free-text entries roll up together. "Manager — Smith" -> "Manager".
const INTERRUPT_ACTORS = ['Manager', 'Supervisor', 'Coworker', 'Customer', 'Other'];
function canonActor(raw) {
  const s = String(raw || '').split('—')[0].trim();
  if (!s) return 'Unspecified';
  const low = s.toLowerCase();
  for (const a of INTERRUPT_ACTORS) if (low === a.toLowerCase() || low.includes(a.toLowerCase())) return a;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
// Roll up interrupted meals by who interrupted them — turns scattered facts into a pattern.
function interruptionRollup(incidents) {
  const actors = {};
  let total = 0;
  for (const i of incidents) {
    if (!hasFlag(i, 'interruptedMeal')) continue;
    total++;
    const a = canonActor(i.meal?.interruptedBy);
    actors[a] = (actors[a] || 0) + 1;
  }
  const byActor = Object.entries(actors).map(([actor, count]) => ({ actor, count })).sort((a, b) => b.count - a.count);
  return { total, byActor };
}

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
    weeklyOvertime: weeklyOvertime(incidents),
    interruptions: interruptionRollup(incidents),
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
      findings: getRules(i.jurisdiction).summarize(i.flags || []),
    }));
}
