// infractionTypes.js — catalog of infraction types + which field groups each needs.
// One concern: configuration/metadata. No logic, no DOM.

export const FIELD = {
  CLOCK: 'clock',      // clock-in / clock-out
  MEAL: 'meal',        // first meal start/end/interrupted/relieved/waived
  MEAL2: 'meal2',      // second meal (shifts over 10h) start/end/waived
  REST: 'rest',        // rest breaks owed/taken/on-call
  OFFCLOCK: 'offclock',// unpaid work start/end, task, who directed/knew, pay period
  NOTICE: 'notice',    // who she told, channel, response
  FINALPAY: 'finalpay',// separation type, last day, date paid, paid-in-full
};

// Each type carries a ONE-LINE legal reference. These are plain-language pointers,
// not legal advice — full citations live in docs/RESEARCH_AND_STRESS_TEST.md.
export const INFRACTION_TYPES = [
  { id: 'worked_past_5h_no_meal', label: 'Past 5 hrs, no lunch', group: 'meal',
    fields: [FIELD.CLOCK, FIELD.MEAL],
    legal: 'Meal must begin before the end of the 5th hour. Lab. Code §512.' },
  { id: 'late_meal', label: 'Late lunch', group: 'meal',
    fields: [FIELD.CLOCK, FIELD.MEAL],
    legal: 'Meal provided, but after the 5th hour. §512 / Donohue presumption.' },
  { id: 'short_meal', label: 'Short lunch (<30m)', group: 'meal',
    fields: [FIELD.CLOCK, FIELD.MEAL],
    legal: 'A meal period must be a full 30 uninterrupted minutes. §512.' },
  { id: 'missed_meal', label: 'No lunch at all', group: 'meal',
    fields: [FIELD.CLOCK, FIELD.MEAL],
    legal: 'No meal provided on a 5h+ shift. §512 → §226.7 premium.' },
  { id: 'interrupted_meal', label: 'Bothered on lunch', group: 'meal',
    fields: [FIELD.CLOCK, FIELD.MEAL],
    legal: 'Interrupted / on-duty meal is non-compliant. §512.' },
  { id: 'second_meal_missed', label: 'No 2nd meal (>10h)', group: 'meal',
    fields: [FIELD.CLOCK, FIELD.MEAL, FIELD.MEAL2],
    legal: 'A second 30-min meal is owed on shifts over 10 hours; waivable only if ≤12h and first meal not waived. §512.' },
  { id: 'rest_missed', label: 'Missed rest break', group: 'rest',
    fields: [FIELD.CLOCK, FIELD.REST],
    legal: 'Paid 10-min rest per 4 hrs worked. §226.7 / Wage Order.' },
  { id: 'rest_interrupted', label: 'Rest interrupted / on-call', group: 'rest',
    fields: [FIELD.CLOCK, FIELD.REST],
    legal: 'Rest must be duty-free, not on-call. Augustus v. ABM.' },
  { id: 'off_clock_work', label: 'Off-the-clock work', group: 'pay',
    fields: [FIELD.CLOCK, FIELD.OFFCLOCK],
    legal: 'All hours worked must be paid; suffered/permitted work counts as hours worked.' },
  { id: 'complaint_raised', label: 'I reported an issue', group: 'notice',
    fields: [FIELD.NOTICE],
    legal: 'Notice undercuts an employer "good-faith" defense. Naranjo (2024).' },
  { id: 'retaliation', label: 'Treated worse after I spoke up', group: 'notice',
    fields: [FIELD.NOTICE],
    legal: 'Adverse action after a protected wage complaint may be unlawful retaliation. Lab. Code §1102.5 / §98.6. Keep proof and the dates.' },
  { id: 'final_pay', label: 'Final pay problem', group: 'final',
    fields: [FIELD.FINALPAY],
    legal: 'Final wages are due immediately if fired, within 72h if you quit without notice; late pay can trigger waiting-time penalties. Lab. Code §§201–203.' },
];

export const TYPES_BY_ID = Object.fromEntries(INFRACTION_TYPES.map(t => [t.id, t]));

export function labelFor(id) { return TYPES_BY_ID[id]?.label || id; }

export function fieldsForTypes(typeIds = []) {
  const set = new Set();
  typeIds.forEach(id => (TYPES_BY_ID[id]?.fields || []).forEach(f => set.add(f)));
  return [...set];
}
