import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interruptedLunchInput } from '../js/capture/quickCapture.js';
import { analyze } from '../js/domain/breakRules.js';

const flagsOf = i => Object.fromEntries(analyze(i).map(f => [f.key, f.value]));

test('interrupted-lunch input is factual: interrupted, on-duty, agreement unknown', () => {
  const i = interruptedLunchInput({ by: 'Manager', name: 'Smith', returnedToWork: true, note: 'pulled to register', workplace: 'Acme' });
  assert.deepEqual(i.types, ['interrupted_meal']);
  assert.equal(i.meal.interrupted, true);
  assert.equal(i.meal.interruptedBy, 'Manager — Smith');
  assert.equal(i.meal.relievedOfDuty, false);   // "returned to work" = not relieved
  assert.equal(i.meal.writtenAgreement, '');     // never asserted here
  assert.equal(i.narrative, 'pulled to register');
});

test('not returning to work leaves relieved-of-duty unknown (null), not asserted', () => {
  const i = interruptedLunchInput({ by: 'Supervisor', returnedToWork: false });
  assert.equal(i.meal.relievedOfDuty, null);
  assert.equal(i.meal.interruptedBy, 'Supervisor');
});

test('the captured facts drive the on-duty finding (no agreement yet -> no premature verdict)', () => {
  const i = interruptedLunchInput({ by: 'Manager', returnedToWork: true });
  const fk = flagsOf({ ...i, meal: { ...i.meal }, meal2: {}, rest: {}, offClock: {}, classification: {} });
  assert.equal(fk.notRelieved, true);             // on-duty fact recorded
  assert.equal(fk.onDutyNoAgreement, undefined);  // unknown agreement -> no violation language
});
