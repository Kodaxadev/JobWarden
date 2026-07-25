// payIssueOptions.js — shared codes and worker-facing labels for structured pay issues.
// One concern: stored codes render consistently in capture, records, and every export.
export const PAYSTUB_ITEMS = [
  ['no_stub', 'No pay stub was provided'],
  ['gross_net', 'Gross or net wages are missing or unclear'],
  ['hours', 'Total hours are missing or look wrong'],
  ['rates', 'Pay rates or hours at each rate are missing or look wrong'],
  ['deductions', 'Deductions are missing or unclear'],
  ['pay_period', 'Pay-period dates are missing or wrong'],
  ['employee_id', 'Employee name or ID information is wrong'],
  ['employer_identity', 'Employer name or address is missing or wrong'],
  ['piece_rate', 'Piece-rate units or rate are missing or wrong'],
];

export const TIP_PROBLEM_OPTIONS = [
  ['', 'What happened to the tips?'],
  ['kept', 'Employer or manager kept some'],
  ['fees', 'Card-processing fees were deducted'],
  ['late_card', 'Credit-card tips were paid after the next payday'],
  ['tip_credit', 'Tips were counted toward base wages'],
  ['manager_pool', 'Owner, manager, or supervisor shared in the pool'],
  ['other', 'Something else'],
];

export const SICK_ACTION_OPTIONS = [
  ['', 'What happened after the request?'],
  ['denied', 'The request was denied'],
  ['replacement', 'I was told to find a replacement'],
  ['occurrence', 'I received an attendance point or occurrence'],
  ['hours_cut', 'My hours or schedule were cut'],
  ['disciplined', 'I was written up, suspended, or demoted'],
  ['fired', 'I was fired'],
  ['other', 'Something else'],
];

const labelFor = (options, key) => options.find(([value]) => value === key)?.[1] || key || '';

export const payStubIssueLabel = key => labelFor(PAYSTUB_ITEMS, key);
export const tipProblemLabel = key => labelFor(TIP_PROBLEM_OPTIONS, key);
export const sickActionLabel = key => labelFor(SICK_ACTION_OPTIONS, key);
