import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mealsRequired, restRequired, mealTiming, analyze } from '../js/domain/breakRules.js';
import { combine } from '../js/domain/timeUtils.js';

const base = (over = {}) => ({
  incidentDate: '2026-06-16', clockIn: '', clockOut: '', types: [],
  meal: {}, meal2: {}, rest: {}, offClock: {}, classification: {}, ...over,
});
const flagsOf = i => Object.fromEntries(analyze(i).map(f => [f.key, f.value]));

test('mealsRequired thresholds (§512)', () => {
  assert.equal(mealsRequired(4), 0);
  assert.equal(mealsRequired(6), 1);
  assert.equal(mealsRequired(11), 2);
});

test('restRequired thresholds (§226.7)', () => {
  assert.equal(restRequired(3), 0);
  assert.equal(restRequired(5), 1);
  assert.equal(restRequired(8), 2);
  assert.equal(restRequired(12), 3);
});

test('first meal is late when it begins after the 5th hour', () => {
  const t = mealTiming(combine('2026-06-16', '09:00'), combine('2026-06-16', '14:30'));
  assert.equal(t.minutesIn, 330);
  assert.equal(t.late, true);
});

test('valid first-meal waiver (≤6h) suppresses late/missed findings', () => {
  const fk = flagsOf(base({ clockIn: '09:00', clockOut: '14:30', types: ['missed_meal'], meal: { waived: true, taken: false } }));
  assert.equal(fk.firstMealWaived, true);
  assert.equal(fk.missedMeal, undefined);
  assert.equal(fk.lateMeal, undefined);
});

test('invalid first-meal waiver (>6h) is flagged', () => {
  assert.equal(flagsOf(base({ clockIn: '09:00', clockOut: '18:00', meal: { waived: true } })).firstMealWaiverInvalid, true);
});

test('second meal owed and missed on a >10h shift', () => {
  const fk = flagsOf(base({ clockIn: '08:00', clockOut: '19:00', meal: { start: '12:00', end: '12:30' } }));
  assert.equal(fk.mealsRequired, 2);
  assert.equal(fk.secondMealMissed, true);
});

test('valid second-meal waiver (≤12h, first not waived)', () => {
  const fk = flagsOf(base({ clockIn: '08:00', clockOut: '19:00', meal: { start: '12:00', end: '12:30' }, meal2: { waived: true } }));
  assert.equal(fk.secondMealWaived, true);
  assert.equal(fk.secondMealMissed, undefined);
});

test('invalid second-meal waiver when first meal was waived', () => {
  assert.equal(flagsOf(base({ clockIn: '08:00', clockOut: '19:00', meal: { waived: true }, meal2: { waived: true } })).secondMealWaiverInvalid, true);
});

test('short second meal is flagged', () => {
  assert.equal(flagsOf(base({ clockIn: '08:00', clockOut: '19:00', meal: { start: '12:00', end: '12:30' }, meal2: { start: '17:00', end: '17:15' } })).secondMealShort, 15);
});

test('on-call during the meal is flagged (not relieved of all duty)', () => {
  const fk = flagsOf(base({ clockIn: '09:00', clockOut: '17:30', types: ['interrupted_meal'], meal: { start: '13:00', end: '13:30', onCall: true } }));
  assert.equal(fk.mealOnCall, true);
});

test('adverse action after a complaint is flagged (§1102.5)', () => {
  assert.equal(flagsOf(base({ types: ['retaliation'], notice: { adverseAction: 'manager emailed the team blaming me' } })).retaliationNoted, true);
});

test('alternative workweek adds an honest note (no OT computed)', () => {
  assert.equal(flagsOf(base({ clockIn: '09:00', clockOut: '19:00', classification: { awsElection: 'yes' } })).awsNote, true);
});

test('union contract (CBA) adds a caveat flag', () => {
  assert.equal(flagsOf(base({ classification: { cbaCovered: 'yes' } })).cbaCaveat, true);
});

test('exempt classification adds a caveat flag', () => {
  assert.equal(flagsOf(base({ clockIn: '09:00', clockOut: '18:00', classification: { payType: 'salary_exempt' } })).exemptCaveat, true);
});

test('off-the-clock minutes are computed', () => {
  assert.equal(flagsOf(base({ types: ['off_clock_work'], offClock: { start: '08:30', end: '09:00' } })).offClockMinutes, 30);
});
