// payStatus.js — shared worker-facing pay/exemption choices and cautions.
// One concern: never infer a legal exemption from the fact that someone is salaried.

export const PAY_STATUS_OPTIONS = [
  ['', 'Not sure'],
  ['hourly', 'Paid by the hour'],
  ['commission', 'Commission or piece rate'],
  ['salary_unknown', 'Salary — exemption not sure'],
  ['salary_nonexempt', 'Salary — not exempt'],
  ['salary_exempt', 'Salary — confirmed exempt'],
];

export const PAY_STATUS_HINT =
  'Salary alone does not make a worker exempt. Choose only what you know.';

export const EXEMPT_STATUS_WARNING =
  'Exempt status depends on job duties and pay tests, not salary alone. If you are unsure, choose “Not sure.”';

export function payStatusLabel(value) {
  return PAY_STATUS_OPTIONS.find(([key]) => key === value)?.[1] || 'Not sure';
}
