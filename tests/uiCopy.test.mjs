import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRAIL_STEPS, ISSUE_GROUPS, BANNED_PRIMARY_WORDS } from '../js/config/uiCopy.js';

const primaryCopy = () => [
  ...TRAIL_STEPS.flatMap(step => [step.title, step.helper]),
  ...ISSUE_GROUPS.flatMap(group => [group.label, ...group.items.map(item => item.label)]),
].join(' ').toLowerCase();

test('trail steps use approved order', () => {
  assert.deepEqual(TRAIL_STEPS.map(step => step.title), [
    'Pick what happened',
    'Add work times',
    'Add lunch breaks',
    'Add unpaid work',
    'Add proof',
    'Tell what happened',
  ]);
});

test('primary copy avoids jargon', () => {
  const text = primaryCopy();
  for (const word of BANNED_PRIMARY_WORDS) assert.equal(text.includes(word), false, word);
});
