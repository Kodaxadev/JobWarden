// breakRules.js — pure California meal/rest analysis. One concern: rule logic.
// Returns FACTUAL flags only — never dollar amounts (research doc §1.3, stress-test #8).
// Flags are framed as "potential" issues: waivers/classification can change the result,
// so the app records facts and flags possibilities; it does not render a verdict.
import { combine, minutesBetween, hoursWorked } from './timeUtils.js';

export const FIFTH_HOUR_MIN = 300;   // first meal must begin before 300 min in (§512)
export const TENTH_HOUR_MIN = 600;   // second meal must begin before 600 min in (§512)
export const MIN_MEAL_MIN = 30;
export const FIRST_WAIVER_MAX_H = 6;  // first meal waivable only if shift <= 6h
export const SECOND_WAIVER_MAX_H = 12; // second meal waivable only if shift <= 12h AND first not waived

const f = (key, value, note) => (note ? { key, value, note } : { key, value });

export function mealsRequired(hrs) {
  if (hrs == null) return null;
  if (hrs > 10) return 2;
  if (hrs > 5) return 1;
  return 0;
}

export function restRequired(hrs) {
  if (hrs == null) return null;
  if (hrs < 3.5) return 0;
  if (hrs <= 6) return 1;
  if (hrs <= 10) return 2;
  if (hrs <= 14) return 3;
  return 4;
}

export function mealTiming(clockIn, mealStart, threshold = FIFTH_HOUR_MIN) {
  const minutesIn = minutesBetween(clockIn, mealStart);
  if (minutesIn == null) return { known: false };
  return { known: true, minutesIn, late: minutesIn > threshold };
}

export function mealLength(mealStart, mealEnd) {
  const mins = minutesBetween(mealStart, mealEnd);
  if (mins == null) return { known: false };
  return { known: true, minutes: mins, short: mins < MIN_MEAL_MIN };
}

function computeHours(i) {
  const d = i.incidentDate;
  const ci = combine(d, i.clockIn);
  const co = combine(d, i.clockOut);
  const m1 = mealLength(combine(d, i.meal?.start), combine(d, i.meal?.end));
  const m2 = mealLength(combine(d, i.meal2?.start), combine(d, i.meal2?.end));
  const unpaid = (m1.known ? m1.minutes : 0) + (m2.known ? m2.minutes : 0);
  return { ci, co, hrs: hoursWorked(ci, co, unpaid) };
}

function firstMealFlags(i, ci, hrs) {
  const out = [];
  const meal = i.meal || {};
  const ms = combine(i.incidentDate, meal.start);
  const len = mealLength(ms, combine(i.incidentDate, meal.end));
  const required = (hrs ?? 0) > 5;

  if (meal.waived) {
    if ((hrs ?? 0) <= FIRST_WAIVER_MAX_H) {
      out.push(f('firstMealWaived', true, 'First meal waived — valid only if the shift is 6 hours or less.'));
      return out; // valid waiver: no missed/late finding
    }
    out.push(f('firstMealWaiverInvalid', true, 'First-meal waiver is invalid on a shift over 6 hours (§512).'));
  }

  const timing = mealTiming(ci, ms, FIFTH_HOUR_MIN);
  if (timing.known) {
    out.push(f('minutesUntilMeal', timing.minutesIn));
    if (timing.late) out.push(f('lateMeal', true, 'First meal began after the 5th hour — potential §512 issue (confirm no valid waiver).'));
  } else if (required && (meal.taken === false || (i.types || []).includes('missed_meal'))) {
    out.push(f('missedMeal', true, 'Meal owed on a 5h+ shift, none recorded — potential §512 / §226.7 issue.'));
  }
  if (len.known && len.short) out.push(f('shortMeal', len.minutes, 'First meal under 30 minutes (§512).'));
  if (meal.interrupted) out.push(f('interruptedMeal', true, 'Interrupted / on-duty meal is non-compliant (§512).'));
  if (meal.onCall) out.push(f('mealOnCall', true, 'Required to stay on-call / reachable during the meal — not relieved of all duty (§512).'));
  if (meal.relievedOfDuty === false) out.push(f('notRelieved', true, 'Not relieved of all duty during meal (§512).'));
  return out;
}

function secondMealFlags(i, ci, hrs) {
  if (hrs == null || hrs <= 10) return [];
  const out = [];
  const m2 = i.meal2 || {};
  const m2s = combine(i.incidentDate, m2.start);
  const len = mealLength(m2s, combine(i.incidentDate, m2.end));
  const firstWaived = !!(i.meal && i.meal.waived);
  const waiverAllowed = hrs <= SECOND_WAIVER_MAX_H && !firstWaived;

  if (len.known) {
    const timing = mealTiming(ci, m2s, TENTH_HOUR_MIN);
    if (timing.known && timing.late) out.push(f('secondMealLate', true, 'Second meal began after the 10th hour — potential §512 issue.'));
    if (len.short) out.push(f('secondMealShort', len.minutes, 'Second meal under 30 minutes (§512).'));
    return out;
  }
  if (m2.waived) {
    if (waiverAllowed) out.push(f('secondMealWaived', true, 'Second meal waived — valid only if shift ≤12h and the first meal was not waived.'));
    else out.push(f('secondMealWaiverInvalid', true, 'Second-meal waiver invalid: shift over 12h or first meal was waived (§512).'));
    return out;
  }
  out.push(f('secondMealMissed', true, 'Second meal owed on a 10h+ shift, none recorded — potential §512 / §226.7 issue.'));
  return out;
}

function restFlags(i, hrs) {
  const out = [];
  const reqRest = restRequired(hrs);
  const rest = i.rest || {};
  if (reqRest != null) out.push(f('restRequired', reqRest));
  if (reqRest != null && rest.taken != null && rest.taken < reqRest) {
    out.push(f('restShortfall', reqRest - rest.taken, `${rest.taken}/${reqRest} rest breaks taken — potential §226.7 issue.`));
  }
  if (rest.interrupted) out.push(f('restInterrupted', true, 'Rest break interrupted (§226.7).'));
  if (rest.onCall) out.push(f('restOnCall', true, 'On-call rest is non-compliant (Augustus v. ABM).'));
  return out;
}

function offClockFlags(i) {
  const o = i.offClock || {};
  const out = [];
  const flagged = (i.types || []).includes('off_clock_work') || o.start || o.end || o.task;
  if (!flagged) return out;
  const mins = minutesBetween(combine(i.incidentDate, o.start), combine(i.incidentDate, o.end));
  if (mins != null) out.push(f('offClockMinutes', mins, 'Unrecorded work time — all hours worked must be paid (suffered/permitted work).'));
  if (o.employerEdited === true) out.push(f('timeRecordEdited', true, 'Employer edited the time record — bears on §226 accuracy and §1174 recordkeeping.'));
  return out;
}

// Analyze a stored incident -> array of factual flags. Pure; reads i.classification for exempt caveat.
export function analyze(i) {
  const flags = [];
  if (i.classification?.payType === 'salary_exempt') {
    flags.push(f('exemptCaveat', true, 'Worker marked salaried-exempt — meal/rest rules may not apply. Confirm classification before relying on findings.'));
  }
  const { ci, hrs } = computeHours(i);
  if (hrs != null) flags.push(f('hoursWorked', Number(hrs.toFixed(2))));
  const rm = mealsRequired(hrs);
  if (rm != null) flags.push(f('mealsRequired', rm));
  flags.push(...firstMealFlags(i, ci, hrs));
  flags.push(...secondMealFlags(i, ci, hrs));
  flags.push(...restFlags(i, hrs));
  flags.push(...offClockFlags(i));
  return flags;
}

// Short human summary of the most important flags, for list rows.
export function summarize(flags = []) {
  const m = Object.fromEntries(flags.map(x => [x.key, x]));
  const p = [];
  if (m.exemptCaveat) p.push('Exempt? confirm');
  if (m.lateMeal) p.push(`Late meal (${m.minutesUntilMeal?.value}m in)`);
  if (m.missedMeal) p.push('No meal');
  if (m.shortMeal) p.push(`Short meal (${m.shortMeal.value}m)`);
  if (m.interruptedMeal) p.push('Meal interrupted');
  if (m.mealOnCall) p.push('On-call at lunch');
  if (m.firstMealWaiverInvalid) p.push('Bad 1st-meal waiver');
  if (m.secondMealMissed) p.push('No 2nd meal');
  if (m.secondMealLate) p.push('Late 2nd meal');
  if (m.secondMealShort) p.push(`Short 2nd meal (${m.secondMealShort.value}m)`);
  if (m.secondMealWaiverInvalid) p.push('Bad 2nd-meal waiver');
  if (m.restShortfall) p.push(`Rest short (${m.restShortfall.value})`);
  if (m.restOnCall) p.push('Rest on-call');
  if (m.offClockMinutes) p.push(`Off-clock ${m.offClockMinutes.value}m`);
  return p;
}
