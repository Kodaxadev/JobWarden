// shiftClock.js — live shift math. One concern: from an in-progress shift + "now", derive the
// meal deadlines and a status, and at the end turn the tracked times into a capture draft.
// Pure (no DOM/storage). Deadlines reuse the §512 thresholds from breakRules.
import { FIFTH_HOUR_MIN, TENTH_HOUR_MIN, MIN_MEAL_MIN } from './breakRules.js';

const MS = 60000;
const SOON_MIN = 30;                       // warn this many minutes before a deadline
const pad = n => String(n).padStart(2, '0');
export const hm = iso => { if (!iso) return ''; const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dateStr = iso => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export function newShift(workplace = '') {
  return {
    startedAt: new Date().toISOString(),
    workplace: workplace || '',
    meals: [],          // [{ start: ISO, end: ISO|null }]
    restCount: 0,
    notified: {},       // { mealSoon, mealOverdue, meal2Due } — set once per alert
  };
}

// Live status for display + alert decisions.
export function shiftStatus(shift, now = Date.now()) {
  const start = new Date(shift.startedAt).getTime();
  const elapsedMin = Math.max(0, Math.round((now - start) / MS));
  const meals = shift.meals || [];
  const last = meals[meals.length - 1];
  const onMeal = !!(last && !last.end);
  const firstMealTaken = meals.length > 0;

  const firstMealByMs = start + FIFTH_HOUR_MIN * MS;
  const firstMealInMin = Math.round((firstMealByMs - now) / MS);
  let mealState;                            // 'taken' | 'ok' | 'soon' | 'overdue'
  if (firstMealTaken) mealState = 'taken';
  else if (now >= firstMealByMs) mealState = 'overdue';
  else if (firstMealInMin <= SOON_MIN) mealState = 'soon';
  else mealState = 'ok';

  const secondMealByMs = start + TENTH_HOUR_MIN * MS;
  const secondMealDue = elapsedMin >= TENTH_HOUR_MIN && meals.length < 2;

  return { elapsedMin, onMeal, firstMealTaken, firstMealByMs, firstMealInMin, mealState, secondMealByMs, secondMealDue };
}

// Which one-time alerts should fire now (names not already in shift.notified).
export function dueAlerts(shift, now = Date.now()) {
  const s = shiftStatus(shift, now);
  const out = [];
  const seen = shift.notified || {};
  if (!s.firstMealTaken && s.mealState === 'soon' && !seen.mealSoon) {
    out.push({ key: 'mealSoon', title: 'Lunch coming up', body: `Your meal should start by ${hm(new Date(s.firstMealByMs).toISOString())} (before the 5th hour). Start it in JobWarden when you do.` });
  }
  if (!s.firstMealTaken && s.mealState === 'overdue' && !seen.mealOverdue) {
    out.push({ key: 'mealOverdue', title: 'Lunch is overdue', body: 'Your shift passed the 5th hour with no meal recorded. Log it the moment it happens — or that it was missed.' });
  }
  if (s.secondMealDue && !seen.meal2Due) {
    out.push({ key: 'meal2Due', title: 'Second meal owed', body: 'Over 10 hours worked — a second meal is owed. Record it (or that none was given).' });
  }
  return out;
}

// Turn a finished shift into a capture-form draft (a NEW record the user reviews + saves).
export function shiftToDraft(shift, endIso, settings = {}) {
  const m1 = (shift.meals || [])[0] || {};
  const m2 = (shift.meals || [])[1] || {};
  const start = new Date(shift.startedAt).getTime();
  const elapsedMin = Math.round(((endIso ? new Date(endIso).getTime() : Date.now()) - start) / MS);

  const types = [];
  const m1len = (m1.start && m1.end) ? Math.round((new Date(m1.end) - new Date(m1.start)) / MS) : null;
  const m1lateMin = m1.start ? Math.round((new Date(m1.start).getTime() - start) / MS) : null;
  if (elapsedMin > FIFTH_HOUR_MIN && !m1.start) types.push('missed_meal');
  else if (m1lateMin != null && m1lateMin > FIFTH_HOUR_MIN) types.push('late_meal');
  if (m1len != null && m1len < MIN_MEAL_MIN) types.push('short_meal');
  if (elapsedMin > TENTH_HOUR_MIN && (shift.meals || []).length < 2) types.push('second_meal_missed');

  return {
    incidentDate: dateStr(shift.startedAt),
    workplace: shift.workplace || (settings.workplaces || [])[0] || '',
    clockIn: hm(shift.startedAt),
    clockOut: hm(endIso),
    meal: { start: hm(m1.start), end: hm(m1.end) },
    meal2: { start: hm(m2.start), end: hm(m2.end) },
    rest: { taken: shift.restCount || null },
    types,
  };
}
