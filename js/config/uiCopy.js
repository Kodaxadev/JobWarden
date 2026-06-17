// uiCopy.js — approved plain-language UI copy. One concern: user-facing wording.
// Primary copy must avoid legal jargon (see BANNED_PRIMARY_WORDS + tests/uiCopy.test.mjs).
export const BANNED_PRIMARY_WORDS = ['infraction', 'waiver', 'classification', 'compliance', 'indexeddb'];

export const TRAIL_STEPS = [
  { id: 'issue', icon: 'circle-alert', title: 'Pick what happened', helper: 'Choose the things that went wrong today.' },
  { id: 'time', icon: 'clock', title: 'Add work times', helper: 'Add when you started and stopped work.' },
  { id: 'meal', icon: 'utensils', title: 'Add lunch breaks', helper: 'Add lunch times, or say if lunch did not happen.' },
  { id: 'offClock', icon: 'timer-off', title: 'Add unpaid work', helper: 'Add work time that was not paid.' },
  { id: 'proof', icon: 'camera', title: 'Add proof', helper: 'Add photos, place, and witnesses.' },
  { id: 'story', icon: 'file-pen-line', title: 'Tell what happened', helper: 'Write short facts. Names, times, and what was said help.' },
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
  { id: 'notice', label: 'I told someone', items: [{ id: 'complaint_raised', label: 'I reported the problem' }] },
];

// Extra trail steps for issues outside the canonical 6-step spine (rest breaks, notice).
export const EXTRA_STEPS = {
  rest: { id: 'rest', icon: 'clock', title: 'Add rest breaks', helper: 'Add 10-minute rest breaks you missed or that were interrupted.' },
  notice: { id: 'notice', icon: 'file-pen-line', title: 'Who you told', helper: 'Add who you told and what they said.' },
};
