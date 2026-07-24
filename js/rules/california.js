// rules/california.js — the California rule set: analysis (re-exported from the pure
// logic in domain/breakRules.js) plus the plain-language labels for its finding keys.
// Informational flags (hoursWorked / mealsRequired / restRequired / the caveats) are
// deliberately NOT labeled — labels mark possible problems for the pattern roll-up.
export { analyze, summarize } from '../domain/breakRules.js';

export const FINDING_LABELS = {
  lateMeal: 'Late lunch',
  missedMeal: 'No lunch',
  missedMealReported: 'No lunch (reported)',
  shortMeal: 'Short lunch (under 30 min)',
  interruptedMeal: 'Lunch interrupted',
  mealOnCall: 'Kept on call at lunch',
  notRelieved: 'Not free of duty at lunch',
  onDutyNoAgreement: 'Worked lunch without a signed agreement',
  secondMealMissed: 'No second lunch (long shift)',
  secondMealReported: 'No second lunch (reported)',
  secondMealLate: 'Late second lunch',
  secondMealShort: 'Short second lunch',
  firstMealWaiverInvalid: 'Lunch skip not allowed on that shift',
  secondMealWaiverInvalid: 'Second-lunch skip not allowed',
  restShortfall: 'Missed rest break',
  restMissedReported: 'Missed rest break (reported)',
  restInterrupted: 'Rest break interrupted',
  restOnCall: 'Rest break kept on-call',
  offClockReported: 'Unpaid work reported',
  timeRecordEdited: 'Employer changed the time record',
  retaliationNoted: 'Possible retaliation after speaking up',
  finalPayLate: 'Final pay late',
  finalPayUnpaid: 'Final pay not received',
  finalPayShort: 'Final pay incomplete',
};
