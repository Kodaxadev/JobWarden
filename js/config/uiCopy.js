// uiCopy.js — approved plain-language UI copy. One concern: user-facing wording.
// Primary copy must avoid legal jargon (see BANNED_PRIMARY_WORDS + tests/uiCopy.test.mjs).
export const BANNED_PRIMARY_WORDS = ['infraction', 'waiver', 'classification', 'compliance', 'indexeddb'];

// The fixed 6-step "Evidence Trail" spine. Each step: icon + title + helper + short button label.
export const TRAIL_STEPS = [
  { id: 'issue', icon: 'triangle-alert', title: 'Pick what happened', helper: 'Choose all that happened today.', btn: 'Pick' },
  { id: 'time', icon: 'clock', title: 'Add work times', helper: 'Add when you started and ended work.', btn: 'Add times' },
  { id: 'meal', icon: 'sandwich', title: 'Add lunch breaks', helper: 'Add your lunch start and end times.', btn: 'Add lunch' },
  { id: 'offClock', icon: 'footprints', title: 'Add unpaid work', helper: 'Add any work you did off the clock.', btn: 'Add unpaid' },
  { id: 'proof', icon: 'camera', title: 'Add proof', helper: 'Add photos or notes that back you up.', btn: 'Add proof' },
  { id: 'story', icon: 'notebook-pen', title: 'Tell what happened', helper: 'Write a few short sentences.', btn: 'Add notes' },
];

export const ISSUE_GROUPS = [
  { id: 'lunch', label: 'Lunch problem', items: [
    { id: 'worked_past_5h_no_meal', label: 'Worked over 5 hours, no lunch' },
    { id: 'late_meal', label: 'Lunch started late' },
    { id: 'short_meal', label: 'Lunch was under 30 minutes' },
    { id: 'missed_meal', label: 'No lunch at all' },
    { id: 'interrupted_meal', label: 'Someone bothered me at lunch' },
    { id: 'second_meal_missed', label: 'No second lunch on a long shift' },
  ] },
  { id: 'rest', label: 'Rest break problem', items: [
    { id: 'rest_missed', label: 'Missed rest break' },
    { id: 'rest_interrupted', label: 'Rest break was interrupted' },
  ] },
  { id: 'pay', label: 'Unpaid work', items: [{ id: 'off_clock_work', label: 'Worked but was not paid' }] },
  { id: 'notice', label: 'Speaking up', items: [
    { id: 'complaint_raised', label: 'I reported the problem' },
    { id: 'retaliation', label: 'Treated worse after I reported it' },
  ] },
  { id: 'final', label: 'Leaving the job', items: [
    { id: 'final_pay', label: 'Final paycheck was wrong or late' },
  ] },
];
