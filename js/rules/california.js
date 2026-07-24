// rules/california.js — the California rule set: analysis (re-exported from the pure
// logic in domain/breakRules.js) plus the plain-language labels for its finding keys.
// Informational flags (hoursWorked / mealsRequired / restRequired / dailyOvertime / the
// caveats, and supporting detail like reportingTimeReason and expenseAskedRefused) are
// deliberately NOT labeled. A label is what makes a flag COUNT as an issue in the pattern
// roll-up, and counting a supporting fact as its own issue would overstate the record —
// the one thing an evidence tool cannot afford. Unlabeled flags still show their note on
// the record and in the printable report; they just do not inflate the tally.
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
  reportingTimeShort: 'Sent home early — reporting-time pay may be owed',
  reportingTimeReported: 'Sent home early (reported)',
  expenseUnreimbursed: 'Paid for work costs, not paid back',
  expenseReported: 'Work expense reported',
  finalPayLate: 'Final pay late',
  finalPayUnpaid: 'Final pay not received',
  finalPayShort: 'Final pay incomplete',
};
