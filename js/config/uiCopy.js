// uiCopy.js — approved plain-language UI copy. One concern: user-facing wording.
// Primary copy must avoid legal jargon (see BANNED_PRIMARY_WORDS + tests/uiCopy.test.mjs).
export const BANNED_PRIMARY_WORDS = ['infraction', 'waiver', 'classification', 'compliance', 'indexeddb'];

// The fixed 6-step "Evidence Trail" spine. Each step: icon + title + helper + short button label.
export const TRAIL_STEPS = [
  { id: 'issue', icon: 'triangle-alert', title: 'Pick what happened', helper: 'Choose all that happened today.', btn: 'Pick' },
  { id: 'time', icon: 'clock', title: 'Add work times', helper: 'Add when you started and ended work.', btn: 'Add times' },
  { id: 'meal', icon: 'sandwich', title: 'Add lunch breaks', helper: 'Add your lunch start and end times.', btn: 'Add lunch' },
  { id: 'offClock', icon: 'footprints', title: 'Add unpaid work', helper: 'Add any work you did off the clock.', btn: 'Add unpaid' },
  { id: 'proof', icon: 'camera', title: 'Add photos', helper: 'A photo of the clock, a pay stub, or a text backs up what you wrote.', btn: 'Add photos' },
  { id: 'story', icon: 'notebook-pen', title: 'Tell what happened', helper: 'Write a few short sentences.', btn: 'Add notes' },
];

export const ISSUE_GROUPS = [
  {
    id: 'lunch', label: 'Meal breaks', icon: 'sandwich',
    helper: 'Missed, late, short, or interrupted',
    items: [
      // Legacy "worked past 5h" records still map to the one missed-meal choice.
      { id: 'missed_meal', label: 'No lunch at all', icon: 'utensils' },
      { id: 'late_meal', label: 'Lunch started late', icon: 'clock-alert' },
      { id: 'short_meal', label: 'Lunch was under 30 minutes', icon: 'timer-off' },
      { id: 'interrupted_meal', label: 'Lunch was interrupted', icon: 'badge-alert' },
      { id: 'second_meal_missed', label: 'No second lunch on a long shift', icon: 'calendar-x' },
    ],
  },
  {
    id: 'rest', label: 'Rest breaks', icon: 'coffee',
    helper: 'Missed, shortened, or interrupted',
    items: [
      { id: 'rest_missed', label: 'Missed rest break', icon: 'coffee' },
      { id: 'rest_interrupted', label: 'Rest break was interrupted', icon: 'shield-alert' },
    ],
  },
  {
    id: 'pay', label: 'Pay & schedule', icon: 'wallet-cards',
    helper: 'Unpaid work, pay records, tips, or scheduling',
    items: [
      { id: 'off_clock_work', label: 'Worked but was not paid', icon: 'timer-off' },
      { id: 'sent_home_early', label: 'Sent home early after showing up', icon: 'log-out' },
      { id: 'expense_unpaid', label: 'Paid for something work required', icon: 'briefcase-business' },
      { id: 'split_shift', label: 'Split workday with an unpaid gap', icon: 'split' },
      { id: 'pay_stub_problem', label: 'Pay stub missing or incorrect', icon: 'receipt-text' },
      { id: 'tips_problem', label: 'Tips kept, reduced, or delayed', icon: 'badge-dollar-sign' },
    ],
  },
  {
    id: 'notice', label: 'Speaking up & sick leave', icon: 'message-circle-warning',
    helper: 'Reports, treatment afterward, or leave',
    items: [
      { id: 'complaint_raised', label: 'I reported the problem', icon: 'megaphone' },
      { id: 'retaliation', label: 'Treated worse after I reported it', icon: 'shield-alert' },
      { id: 'sick_leave_problem', label: 'Action after a sick leave request', icon: 'calendar-heart' },
    ],
  },
  {
    id: 'final', label: 'Leaving the job', icon: 'log-out',
    helper: 'Final paycheck timing or amount',
    items: [
      { id: 'final_pay', label: 'Final paycheck late or incorrect', icon: 'wallet' },
    ],
  },
];
