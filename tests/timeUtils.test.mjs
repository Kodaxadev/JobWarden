// Time math is evidence math: an hour of drift on an overnight shift can move a meal
// deadline, a second-meal threshold, or a daily-OT line. These pin the edges.
process.env.TZ = 'America/Los_Angeles';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combine, minutesBetween, hoursWorked, formatDuration } from '../js/domain/timeUtils.js';

const at = (date, time) => combine(date, time);

test('a same-day span is the plain difference', () => {
  assert.equal(minutesBetween(at('2026-06-16', '08:00'), at('2026-06-16', '16:30')), 510);
});

test('equal start and end is zero, not a whole day', () => {
  assert.equal(minutesBetween(at('2026-06-16', '08:00'), at('2026-06-16', '08:00')), 0);
});

test('an overnight shift rolls the end time to the next day', () => {
  assert.equal(minutesBetween(at('2026-06-16', '22:00'), at('2026-06-16', '06:00')), 8 * 60);
});

test('missing either end returns null rather than guessing', () => {
  assert.equal(minutesBetween(null, at('2026-06-16', '06:00')), null);
  assert.equal(minutesBetween(at('2026-06-16', '22:00'), null), null);
  assert.equal(minutesBetween(at('2026-06-16', ''), at('2026-06-16', '06:00')), null);
});

// --- DST: the night is 23 or 25 hours long, and the worker is owed real hours ---

test('an overnight shift across spring-forward is 7 hours, not 8', () => {
  // 2026-03-08 02:00 PST -> 03:00 PDT. 10pm Sat to 6am Sun is seven worked hours.
  assert.equal(minutesBetween(at('2026-03-07', '22:00'), at('2026-03-07', '06:00')), 7 * 60);
});

test('an overnight shift across fall-back is 9 hours, not 8', () => {
  // 2026-11-01 02:00 PDT -> 01:00 PST. 10pm Sat to 6am Sun is nine worked hours.
  assert.equal(minutesBetween(at('2026-10-31', '22:00'), at('2026-10-31', '06:00')), 9 * 60);
});

test('a same-day shift on a DST date is unaffected', () => {
  assert.equal(minutesBetween(at('2026-03-08', '08:00'), at('2026-03-08', '16:00')), 8 * 60);
});

test('hoursWorked nets out the unpaid meal across a DST night', () => {
  // Spring-forward: 7 real hours minus a 30-minute unpaid lunch.
  assert.equal(hoursWorked(at('2026-03-07', '22:00'), at('2026-03-07', '06:00'), 30), 6.5);
});

test('hoursWorked never goes negative when the meal is longer than the span', () => {
  assert.equal(hoursWorked(at('2026-06-16', '08:00'), at('2026-06-16', '08:30'), 90), 0);
});

test('formatDuration reads like a person wrote it', () => {
  assert.equal(formatDuration(null), '—');
  assert.equal(formatDuration(0), '0m');
  assert.equal(formatDuration(45), '45m');
  assert.equal(formatDuration(60), '1h');
  assert.equal(formatDuration(95), '1h 35m');
  assert.equal(formatDuration(-30), '-30m');
});

test('combine rejects malformed dates and times instead of inventing one', () => {
  assert.equal(combine('not-a-date', '08:00'), null);
  assert.equal(combine('2026-06-16', 'lunchtime'), null);
  assert.equal(combine('', '08:00'), null);
});
