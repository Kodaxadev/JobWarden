// rules/newYork.js — New York rule set. Analysis only; NOT user-exposed until a New York
// employment-attorney review clears (jurisdictions.NY.status = 'draft'). NY is a different
// SHAPE than California, not different numbers — see the NY research doc:
//   • NO general paid rest breaks for adults (so we never flag a "missed rest break")
//   • NO daily overtime / no alternative-workweek concept (OT is weekly, 40h)
//   • spread-of-hours: an extra hour when the workday SPANS > 10h (derivable from clock-in/out)
//   • meal §162 keys off the noon period + a 6h threshold, an evening meal, and a
//     night-shift meal (§162(4)) for shifts starting between 1pm and 6am
//   • final pay is due the next regular payday — no §203 immediate-pay / waiting-time rule
// Facts and counts only; never dollars, never a verdict. Every note is "potential, confirm."
//
// All windows are computed as absolute times on the shift's start date (end = start + span),
// never as bare time-of-day comparisons — so an overnight shift (6pm–2am) is not mistaken
// for one that "spans noon" or "starts before 11am."
import { combine, minutesBetween, hoursWorked } from '../domain/timeUtils.js';

const MIN_MEAL_MIN = 30;    // mercantile floor; factories are owed 60 at noon — caveat, not computed
const SPREAD_MIN = 600;     // > 10 hours start-to-end

const f = (key, value, note) => (note ? { key, value, note } : { key, value });

function computeHours(i) {
  const d = i.incidentDate;
  const ci = combine(d, i.clockIn), co = combine(d, i.clockOut);
  const m1 = minutesBetween(combine(d, i.meal?.start), combine(d, i.meal?.end));
  const m2 = minutesBetween(combine(d, i.meal2?.start), combine(d, i.meal2?.end));
  const unpaid = (m1 || 0) + (m2 || 0);
  return { ci, hrs: hoursWorked(ci, co, unpaid), span: minutesBetween(ci, co) };
}

// Absolute shift window on the start date: [startMs, endMs] with the span carrying
// any midnight crossing. tod(hhmm) is that clock time on the SAME start date.
function shiftWindow(i, ci, span) {
  if (!ci || span == null) return null;
  const start = ci.getTime();
  const tod = (hhmm) => combine(i.incidentDate, hhmm)?.getTime();
  return { start, end: start + span * 60000, tod };
}

// §162 meals. Noon meal (subd. 2): 30 min for a shift over 6h that extends over the
// 11am–2pm noon period. Evening meal (subd. 3): +20 min between 5–7pm when the shift
// starts before 11am and runs past 7pm. Night meal (subd. 4): 45 min midway, for a
// shift over 6h starting between 1pm and 6am. NY meals must be uninterrupted.
function mealFlags(i, hrs, w) {
  const out = [];
  const meal = i.meal || {};
  const types = i.types || [];
  const noMeal = meal.taken === false || (!meal.start && !meal.end) ||
    types.includes('missed_meal') || types.includes('worked_past_5h_no_meal');
  const len = minutesBetween(combine(i.incidentDate, meal.start), combine(i.incidentDate, meal.end));

  if (w && (hrs ?? 0) > 6) {
    const nightStart = w.start >= w.tod('13:00') || w.start < w.tod('06:00');
    if (nightStart) {
      if (noMeal) out.push(f('nyNightMeal', true, 'Worked more than 6 hours on a shift starting between 1pm and 6am with no meal recorded — New York owes a 45-minute meal midway through such shifts (Labor Law §162(4); 60 minutes in factories). Factual observation, not a legal conclusion.'));
    } else {
      const overNoon = w.start < w.tod('14:00') && w.end > w.tod('11:00');
      if (overNoon && noMeal) {
        out.push(f('nyMealMissing', true, 'Worked more than 6 hours over the midday period with no 30-minute meal recorded — potential NY Labor Law §162 issue (60 minutes in factories). Factual observation, not a legal conclusion.'));
      }
    }
  }

  if (len != null && len < MIN_MEAL_MIN) out.push(f('nyMealShort', len, 'Meal under 30 minutes (NY Labor Law §162).'));
  if (meal.interrupted || types.includes('interrupted_meal')) out.push(f('nyMealInterrupted', true, 'Meal was interrupted — a NY meal period must be uninterrupted (§162).'));

  // Evening meal: shift starts before 11am and continues past 7pm.
  if (w && w.start < w.tod('11:00') && w.end > w.tod('19:00')) {
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
  const { ci, hrs, span } = computeHours(i);
  if (hrs != null) flags.push(f('hoursWorked', Number(hrs.toFixed(2))));
  if (hrs != null && hrs > 8) {
    flags.push(f('nyOvertimeNote', true, 'New York overtime is weekly (over 40 hours in a week), not daily — a single long day is not daily overtime by itself.'));
  }
  const w = shiftWindow(i, ci, span);
  flags.push(...mealFlags(i, hrs, w));
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
  if (m.nyNightMeal) p.push('No night-shift meal');
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

export const FINDING_LABELS = {
  nyMealMissing: 'No meal (worked over 6 hours)',
  nyNightMeal: 'No night-shift meal',
  nyMealShort: 'Short meal (under 30 min)',
  nyMealInterrupted: 'Meal interrupted',
  nyEveningMeal: 'No evening meal (long day)',
  spreadOver10: 'Workday spanned over 10 hours',
  nyRetaliation: 'Possible retaliation after speaking up',
  nyFinalPayShort: 'Final pay incomplete',
  nyFinalPayUnpaid: 'Final pay not received',
  timeRecordEdited: 'Employer changed the time record',
};
