import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAY_STATUS_OPTIONS, PAY_STATUS_HINT, payStatusLabel } from '../js/config/payStatus.js';

test('pay status never equates salary with legal exemption', () => {
  const options = Object.fromEntries(PAY_STATUS_OPTIONS);
  assert.equal(options[''], 'Not sure');
  assert.equal(options.salary_unknown, 'Salary — exemption not sure');
  assert.equal(options.salary_nonexempt, 'Salary — not exempt');
  assert.equal(options.salary_exempt, 'Salary — confirmed exempt');
  assert.match(PAY_STATUS_HINT, /Salary alone does not make (?:someone|a worker) exempt/i);
  assert.equal(PAY_STATUS_OPTIONS.some(([, label]) => label === 'Salaried'), false);
  assert.equal(payStatusLabel('salary_nonexempt'), 'Salary — not exempt');
  assert.equal(payStatusLabel('unexpected-value'), 'Not sure');
});
