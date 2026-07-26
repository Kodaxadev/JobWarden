// The surfaces, shadows, spacing, type and motion each have a scale. The interaction STATES did
// not, so every control eyeballed its own: seven press washes between .045 and .06, three hover
// washes, four press-inset depths. That is the same failure the type scale had — with nothing to
// reach for, each stylesheet invents a number — and it broke the light theme outright, because a
// white 3% wash is invisible on a cream surface. These tests keep the vocabulary from drifting
// back one control at a time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const SHEETS = readdirSync('css').filter(f => f.endsWith('.css'));
const css = (f) => readFileSync(`css/${f}`, 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ''); // comments discuss values without being them
const TOKENS = css('tokens.css');
const LIGHT = css('light.css');

const INTERACTION_TOKENS = [
  '--wash-hover', '--wash-press', '--press-drop', '--press-sink', '--press-sink-sm',
  '--recess', '--recess-field',
];

test('the interaction-lighting vocabulary exists as tokens', () => {
  for (const t of INTERACTION_TOKENS) {
    assert.match(TOKENS, new RegExp(`${t}\\s*:`), `${t} must be defined in tokens.css`);
  }
});

// Every one of these is remapped for daylight. Miss one and a control either keeps a white wash
// nothing can see on cream, or a black inset where paper wants a soft brown press.
test('every interaction token is remapped for the light theme', () => {
  for (const t of INTERACTION_TOKENS) {
    if (t === '--press-drop') continue; // travel is a distance, not a colour; it is theme-neutral
    assert.match(LIGHT, new RegExp(`${t}\\s*:`), `${t} must be overridden for the light theme`);
  }
});

test('daylight interaction values are ink, never white', () => {
  const block = /:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/.exec(LIGHT)[1];
  for (const t of ['--wash-hover', '--wash-press']) {
    const value = new RegExp(`${t}\\s*:\\s*([^;]+);`).exec(block)?.[1] ?? '';
    assert.doesNotMatch(value, /rgba\(255,\s*255,\s*255/, `${t} is invisible on a pale surface`);
    assert.match(value, /rgba\(\s*\d+/, `${t} should be an ink tint, got: ${value}`);
  }
});

// The whole point of a token is that nobody writes the literal again.
test('no stylesheet hand-writes a hover or press value any more', () => {
  const offenders = [];
  for (const f of SHEETS) {
    const body = strip(css(f));
    for (const line of body.split('\n')) {
      if (!/:hover|:active/.test(line)) continue;
      // A coloured control deepens its OWN hue on hover rather than taking a neutral wash — that
      // is the documented exception, not drift.
      if (/rgba\(224,89,77|rgba\(183,58,47/.test(line)) continue;
      if (/rgba\(255,\s*255,\s*255,\s*\.0\d+\)/.test(line)) offenders.push(`${f}: white wash — ${line.trim().slice(0, 90)}`);
      if (/translateY\(1px\)/.test(line)) offenders.push(`${f}: literal press travel — ${line.trim().slice(0, 90)}`);
      if (/opacity:\s*\.7/.test(line)) offenders.push(`${f}: a fade is not a press — ${line.trim().slice(0, 90)}`);
    }
  }
  assert.deepEqual(offenders, [], `reach for the tokens in tokens.css:\n${offenders.join('\n')}`);
});

test('the pressables actually use the tokens (the guard is not passing on an empty set)', () => {
  const all = SHEETS.map(css).join('\n');
  for (const t of ['--wash-hover', '--wash-press', '--press-drop', '--press-sink-sm', '--recess']) {
    assert.ok(all.includes(`var(${t})`), `${t} is defined but nothing consumes it`);
  }
});

// --- the disclosure reveal --------------------------------------------------

// Adaptive disclosure is the product's central pattern, and the reveal must never be the reason
// content cannot be read: no height-to-auto under overflow:hidden, where a timeline that does not
// advance (print, a paused renderer, a browser without ::details-content) leaves a panel clipped
// around content that is really there.
test('every disclosure in the app opens with the one shared keyframe', () => {
  const system = css('system.css');
  assert.match(system, /@keyframes disclose/);
  for (const surface of ['.issue-group', '.logsec-more', '.glance-means', '.rights-item',
    '.history', '.deleted-wrap', '.onboard-setup', '.row.expanded .row-detail']) {
    assert.ok(system.includes(surface), `${surface} must be in the disclose rule`);
  }
});

test('no disclosure gates its content behind a clipped height animation', () => {
  const all = SHEETS.map(f => strip(css(f))).join('\n');
  assert.doesNotMatch(all, /::details-content/,
    'animating height to auto under overflow:hidden can leave a panel clipped — see the Reveal-Never-Hides Rule');
  assert.doesNotMatch(all, /interpolate-size/, 'same reason: it only exists to animate height to a keyword');
});

// --- the travelling tab indicator ------------------------------------------

test('the active-tab indicator is one marker that moves, not one per tab', () => {
  const shell = css('shell.css');
  assert.doesNotMatch(strip(shell), /\.tab\.active::before/,
    'a mark on each tab cannot travel between them');
  assert.match(shell, /\.tabbar::after/);
  assert.match(shell, /--tab-count/, 'the geometry must not hardcode four tabs');
  assert.match(shell, /transform: translateX\(calc\(var\(--tab-i/, 'transform only — never animate left');
  // and the app has to actually drive it
  const app = readFileSync('js/app.js', 'utf8');
  assert.match(app, /setProperty\('--tab-i'/);
});

// --- the two quiet disclosures ---------------------------------------------

test('no disclosure is left showing the browser’s own triangle', () => {
  const all = SHEETS.map(css).join('\n');
  const markup = ['js/ui/deletedRecords.js', 'js/ui/incidentList.js']
    .map(f => readFileSync(f, 'utf8')).join('\n');
  assert.match(all, /\.quiet-summary::-webkit-details-marker \{ display: none; \}/);
  assert.match(all, /\.quiet-summary \{[\s\S]*?list-style: none/);
  // both quiet summaries carry the app's caret rather than the UA marker
  assert.equal((markup.match(/quiet-summary-chevron/g) || []).length, 2);
});
