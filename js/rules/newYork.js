// rules/newYork.js — New York rule set. Analysis only; NOT user-exposed until a New York
// employment-attorney review clears (jurisdictions.NY.status = 'draft'). NY is a different
// SHAPE than California, not different numbers — see the NY research doc:
//   • NO general paid rest breaks for adults (so we never flag a "missed rest break")
//   • NO daily overtime / no alternative-workweek concept (OT is weekly, 40h)
//   • spread-of-hours: an extra hour when the workday SPANS > 10h (derivable from clock-in/out)
//   • meal §162 keys off the noon period + a 6h threshold, plus an evening meal
//   • final pay is due the next regular payday — no §203 immediate-pay / waiting-time rule
// Facts and counts only; never dollars, never a verdict. Every note is "potential, confirm."
import { combine, minutesBetween, hoursWorked, formatDate } from '../domain/timeUtils.js';

const NOON_START = '11:00';
const NOON_END = '14:00';   // shift must extend over the 11am–2pm noon period
const MIN_MEAL_MIN = 30;
const SPREAD_MIN = 600;     // > 10 hours start-to-end

const f = (key, value, note) => (note ? { key, value, note } : { key, value });
const before = (a, b) => { const x = minutesBetween(combine('2000-01-01', a), combine('2000-01-01', b)); return x != null && x > 0; };

function computeHours(i) {
  const d = i.incidentDate;
  const ci = combine(d, i.clockIn), co = combine(d, i.clockOut);
  const m1 = minutesBetween(combine(d, i.meal?.start), combine(d, i.meal?.end));
  const m2 = minutesBetween(combine(d, i.meal2?.start), combine(d, i.meal2?.end));
  const unpaid = (m1 || 0) + (m2 || 0);
  return { ci, co, hrs: hoursWorked(ci, co, unpaid), span: minutesBetween(ci, co) };
}

// §162: 30-min meal for a shift > 6h that extends over the noon period; +20-min evening meal
// when the shift starts before 11am and continues past 7pm. NY meals must be uninterrupted.
function mealFlags(i, hrs) {
  const out = [];
  const meal = i.meal || {};
  const overNoon = i.clockIn && i.clockOut && before(i.clockIn, NOON_END) && before(NOON_START, i.clockOut);
  const owed = (hrs ?? 0) > 6 && overNoon;
  const len = minutesBetween(combine(i.incidentDate, meal.start), combine(i.incidentDate, meal.end));
  const noMeal = meal.taken === false || (!meal.start && !meal.end);

  if (owed && noMeal) {
    out.push(f('nyMealMissing', true, 'Worked more than 6 hours over the midday period with no 30-minute meal recorded — potential NY Labor Law §162 issue. Factual observation, not a legal conclusion.'));
  }
  if (len != null && len < MIN_MEAL_MIN) out.push(f('nyMealShort', len, 'Meal under 30 minutes (NY Labor Law §162).'));
  if (meal.interrupted) out.push(f('nyMealInterrupted', true, 'Meal was interrupted — a NY meal period must be uninterrupted (§162).'));

  // Evening meal: shift starts before 11am and continues past 7pm.
  if (i.clockIn && i.clockOut && before(i.clockIn, NOON_START) && before('19:00', i.clockOut)) {
    const hasSecond = !!(i.meal2 && (i.meal2.start || i.meal2.end));
    if (!hasSecond) out.push(f('nyEveningMeal', true, 'Shift started before 11am and ran past 7pm — NY owes an additional ~20-minute meal between 5–7pm (§162); none recorded.'));
  }
  return out;
}

// Spread of hours (12 NYCRR §142-2.4 / §146-1.6): +1 hour at minimum wage when the workday
// SPANS more than 10 hours start-to-end (including breaks). Owed regardless of pay rate in
// hospitality; only below the daily minimum-wage floor in other industries — so we flag the
// FACT and caveat the rest (we don't store wage rate or industry, and never compute dollars).
function spreadFlag(i, span) {
  if (span == null || span <= SPREAD_MIN) return [];
  const hrs = Math.round((span / 60) * 10) / 10;
  return [f('spreadOver10', hrs, 'The workday spanned more than 10 hours (start to end, including breaks). New York may owe an extra hour at the minimum wage (spread-of-hours) — whether it applies depends on your industry and pay rate. Potential issue, not a legal conclusion.')];
}

// Final pay (NY Labor Law §191): due by the NEXT regular payday — no California-style
// immediate-pay rule and no §203 waiting-time penalty. So no "days late" math; just the facts.
function finalPayFlags(i) {
  const fp = i.finalPay || {};
  if (!((i.types || []).includes('final_pay') || fp.separation || fp.lastDay)) return [];
  const out = [];
  if (fp.fullyPaid === false) out.push(f('nyFinalPayShort', true, 'Reported the final paycheck did not include everything owed — final wages are due by the next regular payday (NY Labor Law §191).'));
  if (fp.separation && fp.lastDay && !fp.datePaid) out.push(f('nyFinalPayUnpaid', true, 'Final pay reported as not yet received. NY final wages are due by the next regular payday (§191).'));
  return out;
}

function noticeFlags(i) {
  const n = i.notice || {};
  if ((i.types || []).includes('retaliation') || n.adverseAction) {
    return [f('nyRetaliation', true, 'Adverse action after a complaint — possible retaliation (NY Labor Law §215). Document the timeline.')];
  }
  return [];
}

function offClockFlags(i) {
  const o = i.offClock || {};
  const flagged = (i.types || []).includes('off_clock_work') || o.start || o.end || o.task;
  if (!flagged) return [];
  const out = [];
  const mins = minutesBetween(combine(i.incidentDate, o.start), combine(i.incidentDate, o.end));
  if (mins != null) out.push(f('offClockMinutes', mins, 'Unrecorded work time — all hours suffered or permitted must be paid (NY Labor Law §§191, 663).'));
  if (o.employerEdited === true) out.push(f('timeRecordEdited', true, 'Employer edited the time record — bears on NY recordkeeping (§195).'));
  return out;
}

export function analyze(i) {
  const flags = [];
  if (i.classification?.payType === 'salary_exempt') {
    flags.push(f('exemptCaveat', true, 'Marked salaried-exempt — meal rules may not apply. Confirm classification before relying on findings.'));
  }
  if (i.classification?.cbaCovered === 'yes') {
    flags.push(f('cbaCaveat', true, 'Covered by a union contract (CBA) — terms may differ. Confirm the agreement.'));
  }
  const { hrs, span } = computeHours(i);
  if (hrs != null) flags.push(f('hoursWorked', Number(hrs.toFixed(2))));
  if (hrs != null && hrs > 8) {
    flags.push(f('nyOvertimeNote', true, 'New York overtime is weekly (over 40 hours in a week), not daily — a single long day is not daily overtime by itself.'));
  }
  flags.push(...mealFlags(i, hrs));
  flags.push(...spreadFlag(i, span));
  flags.push(...offClockFlags(i));
  flags.push(...noticeFlags(i));
  flags.push(...finalPayFlags(i));
  // Deliberately NO rest-break flags: New York does not mandate paid rest breaks for adults.
  return flags;
}

// Short labels for the row summary (parallels California's summarize).
export function summarize(flags = []) {
  const m = Object.fromEntries(flags.map(x => [x.key, x]));
  const p = [];
  if (m.exemptCaveat) p.push('Exempt? confirm');
  if (m.nyMealMissing) p.push('No meal');
  if (m.nyMealShort) p.push(`Short meal (${m.nyMealShort.value}m)`);
  if (m.nyMealInterrupted) p.push('Meal interrupted');
  if (m.nyEveningMeal) p.push('No evening meal');
  if (m.spreadOver10) p.push(`Spread of hours (${m.spreadOver10.value}h)`);
  if (m.offClockMinutes) p.push(`Off-clock ${m.offClockMinutes.value}m`);
  if (m.nyRetaliation) p.push('Possible retaliation');
  if (m.nyFinalPayShort) p.push('Final pay short');
  if (m.nyFinalPayUnpaid) p.push('Final pay not received');
  return p;
}
