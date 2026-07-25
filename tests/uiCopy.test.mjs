import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRAIL_STEPS, ISSUE_GROUPS, BANNED_PRIMARY_WORDS } from '../js/config/uiCopy.js';
import { TOPICS } from '../js/ui/rightsFaq.js';

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
    'Add photos',
    'Tell what happened',
  ]);
});

test('primary copy avoids jargon', () => {
  const text = primaryCopy();
  for (const word of BANNED_PRIMARY_WORDS) assert.equal(text.includes(word), false, word);
});

test('the interrupted-lunch shortcut says exactly what it opens', () => {
  const app = readFileSync('js/capture/captureForm.js', 'utf8');
  const landing = readFileSync('landing.html', 'utf8');
  assert.doesNotMatch(app, /Quick log/);
  assert.doesNotMatch(landing, /Quick log/);
  assert.match(app, /Interrupted lunch/);
  assert.match(landing, /Interrupted lunch/);
});

// The banned-word list guards vocabulary. It says nothing about sentence length, which is
// what actually breaks comprehension — and the rights guide is the longest prose in the
// app, read on a phone by someone who is upset. Short words in a 35-word sentence still
// lose the reader. This is the guard for that.
const MAX_SENTENCE_WORDS = 28;
// Split on terminal punctuation, allowing a closing quote or paren after it — this copy uses
// curly quotes, and `pay.”` ends a sentence just as much as `pay.` does.
const sentencesOf = (text) => text.split(/(?<=[.!?][”"’')\]]?)\s+/).map(s => s.trim()).filter(Boolean);
const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;

test('no sentence in the rights guide runs past 28 words', () => {
  const tooLong = [];
  for (const topic of TOPICS) {
    for (const text of [...topic.paras, topic.app].filter(Boolean)) {
      for (const s of sentencesOf(text)) {
        if (wordCount(s) > MAX_SENTENCE_WORDS) tooLong.push(`${wordCount(s)}w in "${topic.q}": ${s.slice(0, 70)}…`);
      }
    }
  }
  assert.deepEqual(tooLong, [], `split these into shorter sentences:\n${tooLong.join('\n')}`);
});

test('every rights topic still carries its legal citation', () => {
  for (const topic of TOPICS) {
    assert.ok(topic.q && topic.paras?.length, `${topic.q} needs a question and body`);
    assert.match(topic.cite, /§|v\./, `${topic.q} must cite the authority it is summarizing`);
  }
});
