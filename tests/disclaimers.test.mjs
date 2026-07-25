// The app's whole defensible position is that it records ONE PERSON'S ACCOUNT and decides
// nothing. That position is made of copy, and copy drifts — a marketing word slips into a
// headline, a helper text starts calling a photo "proof", and the position is gone without
// anyone editing a policy. These tests are what stops that.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SHORT, NOT_A_VERDICT, WHAT_FINDINGS_MEAN, WHAT_THE_SEAL_MEANS,
  DOCUMENT_PREAMBLE, DOCUMENT_FOOTER, BANNED_CLAIM_WORDS,
} from '../js/config/disclaimers.js';
import { TRAIL_STEPS, ISSUE_GROUPS } from '../js/config/uiCopy.js';
import { TOPICS } from '../js/ui/rightsFaq.js';
import { buildReportHtml } from '../js/export/exportReport.js';
import { buildSummaryHtml } from '../js/export/exportSummary.js';
import { createIncident } from '../js/domain/incidentModel.js';
import { analyze } from '../js/domain/breakRules.js';

const record = () => createIncident({
  incidentDate: '2026-06-16', types: ['missed_meal'], clockIn: '08:00', clockOut: '17:00',
  workplace: 'Store #12', narrative: 'No lunch.',
});

// --- the disclaimers themselves say the three things they must say -----------

test('the standing disclaimer refuses all three: a verdict, a claim, and a prediction', () => {
  const all = [NOT_A_VERDICT, ...WHAT_FINDINGS_MEAN, ...DOCUMENT_PREAMBLE.paras, DOCUMENT_FOOTER].join(' ');
  assert.match(all, /does not decide|not a decision|not legal conclusions/i, 'must disclaim deciding');
  assert.match(all, /whether you have a claim|that any claim exists/i, 'must disclaim the claim question');
  assert.match(all, /have not been verified|not been verified/i, 'must say nobody verified the records');
  assert.match(all, /no representation is made about how any employer, agency, or court/i,
    'must disclaim predicting what anyone will do');
});

test('the seal statement says what it shows AND what it does not', () => {
  assert.match(WHAT_THE_SEAL_MEANS, /has not changed since it was saved/i);
  assert.match(WHAT_THE_SEAL_MEANS, /does not show that the times or events entered are true/i);
  assert.match(WHAT_THE_SEAL_MEANS, /not a timestamp from any outside service/i);
});

test('the short form still names the two essentials', () => {
  assert.match(SHORT, /your own/i);
  assert.match(SHORT, /not legal advice/i);
});

// --- no over-promise reaches the user ---------------------------------------

const USER_FACING_FILES = [
  'install.html', 'index.html', 'privacy.html', 'terms.html',
  'js/config/uiCopy.js', 'js/config/infractionTypes.js',
  'js/ui/legalView.js', 'js/ui/rightsFaq.js', 'js/ui/incidentList.js',
  'js/ui/onboarding.js', 'js/ui/settingsView.js', 'js/ui/exportView.js', 'js/ui/shiftPanel.js',
  'js/capture/captureFields.js', 'js/capture/captureForm.js', 'js/capture/quickCapture.js',
  'js/domain/breakRules.js', 'js/rules/california.js',
  'js/export/exportReport.js', 'js/export/exportSummary.js', 'js/export/reportBrand.js',
];

// Only what a user can actually READ. Code identifiers (`proofSection`, `withProofCount`)
// never reach a screen, and flagging them would train everyone to ignore this test.
// For JS that means string literals; for HTML, text between tags plus the attributes that
// get rendered. Comments are excluded either way — a maintainer note explaining why a word
// is banned must not itself trip the ban.
function userVisibleStrings(file) {
  const src = readFileSync(file, 'utf8');
  if (file.endsWith('.html')) {
    return src
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*\b(alt|title|placeholder|content)="([^"]*)"[^>]*>/gi, ' $2 ')
      .replace(/<[^>]+>/g, ' ')
      .split(/\n{2,}|(?<=\.)\s/);
  }
  const noComments = src
    .split('\n')
    .map(l => l.replace(/^\s*\/\/.*$/, '').replace(/(?<!:)\/\/\s.*$/, ''))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
  return [...noComments.matchAll(/'([^'\\\n]{6,})'|"([^"\\\n]{6,})"|`([^`\\]{6,})`/g)]
    .map(m => m[1] || m[2] || m[3])
    // `${s.withProofCount}` is an identifier the template interpolates, not text anyone reads.
    .map(str => str.replace(/\$\{[^}]*\}/g, ' '));
}

// "not proof", "cannot tell you whether you have a case", "this is not a guarantee" — the
// app disclaiming the thing is exactly the wording we want. Look back far enough to see it.
const NEGATED = /\b(not|never|cannot|can't|isn't|no|without|nothing|does not|do not)\b[^.!?]{0,50}$/i;

test('no user-facing text promises proof, a case, or an outcome', () => {
  const hits = [];
  for (const file of USER_FACING_FILES) {
    for (const raw of userVisibleStrings(file)) {
      const text = raw.toLowerCase();
      for (const word of BANNED_CLAIM_WORDS) {
        let at = text.indexOf(word);
        while (at !== -1) {
          if (!NEGATED.test(text.slice(0, at))) {
            hits.push(`${file}: "${word}" — …${raw.slice(Math.max(0, at - 70), at + 45).replace(/\s+/g, ' ')}…`);
          }
          at = text.indexOf(word, at + word.length);
        }
      }
    }
  }
  assert.deepEqual(hits, [], `these assert something the app cannot know:\n${hits.join('\n')}`);
});

test('the guard actually catches an over-promise (a guard that never fires is not a guard)', () => {
  const sneaky = 'This report is proof that your employer broke the law.';
  const tripped = BANNED_CLAIM_WORDS.filter(w => {
    const at = sneaky.toLowerCase().indexOf(w);
    return at !== -1 && !NEGATED.test(sneaky.toLowerCase().slice(0, at));
  });
  assert.ok(tripped.length >= 2, `expected several hits, got ${JSON.stringify(tripped)}`);
  // …and that the disclaiming form of the same sentence passes.
  const honest = 'This report is not proof, and it does not show that your employer broke any rule.';
  const clean = BANNED_CLAIM_WORDS.filter(w => {
    const at = honest.toLowerCase().indexOf(w);
    return at !== -1 && !NEGATED.test(honest.toLowerCase().slice(0, at));
  });
  assert.deepEqual(clean, [], `the honest wording must pass: ${JSON.stringify(clean)}`);
});

test('no finding note tells the user a law WAS broken', () => {
  const flags = analyze(createIncident({
    incidentDate: '2026-06-16', types: ['missed_meal', 'off_clock_work', 'rest_missed', 'final_pay', 'retaliation', 'sent_home_early', 'expense_unpaid'],
    clockIn: '08:00', clockOut: '19:00', rest: { taken: 0 },
    finalPay: { separation: 'fired', lastDay: '2026-06-01', datePaid: '2026-06-20', fullyPaid: false },
    schedule: { scheduledStart: '08:00', scheduledEnd: '20:00' },
    expense: { item: 'boots', reimbursed: false },
  }));
  assert.ok(flags.length > 5, 'the fixture should light up most of the rule set');
  for (const f of flags.filter(x => x.note)) {
    assert.equal(/\byour employer (broke|violated|owes you)\b/i.test(f.note), false, `${f.key}: ${f.note}`);
    assert.equal(/\bis illegal\b/i.test(f.note), false, `${f.key} states a conclusion: ${f.note}`);
    assert.equal(/\$\d/.test(f.note), false, `${f.key} names a dollar amount: ${f.note}`);
    assert.equal(/\byou have a (case|claim)\b/i.test(f.note), false, `${f.key}: ${f.note}`);
  }
});

// --- the documents that leave the device carry the framing ------------------

for (const [name, build] of [['report', buildReportHtml], ['summary', buildSummaryHtml]]) {
  test(`the printable ${name} leads with whose account it is, before any record`, async () => {
    const html = await build([record()], { employeeName: 'Ana R.', employer: 'Acme' });
    assert.ok(html.includes(DOCUMENT_PREAMBLE.title), 'the preamble must be present');
    for (const p of DOCUMENT_PREAMBLE.paras) {
      assert.ok(html.includes(p.replace(/&/g, '&amp;').replace(/"/g, '&quot;')), `missing preamble line: ${p.slice(0, 40)}`);
    }
    const preambleAt = html.indexOf(DOCUMENT_PREAMBLE.title);
    const firstRecordAt = html.indexOf('Store #12');
    assert.ok(preambleAt > 0 && preambleAt < firstRecordAt,
      'the preamble must come BEFORE the records, not after them');
  });

  test(`the printable ${name} carries the standing footer and the seal's limits`, async () => {
    const html = await build([record()], {});
    assert.ok(html.includes(DOCUMENT_FOOTER.replace(/&/g, '&amp;')), 'the footer must be the shared wording');
    assert.ok(html.includes(WHAT_THE_SEAL_MEANS.replace(/&/g, '&amp;')), 'the seal limits must travel with the seal');
  });
}

test('the signature line claims only personal knowledge, not truth', async () => {
  const html = await buildReportHtml([record()], {});
  assert.match(html, /my own records of my own working conditions/);
  assert.match(html, /to the best of my knowledge and recollection/);
});

// --- the in-app copy stays in the same voice --------------------------------

test('no issue chip or capture step asserts a conclusion', () => {
  const copy = [
    ...TRAIL_STEPS.flatMap(s => [s.title, s.helper, s.btn]),
    ...ISSUE_GROUPS.flatMap(g => [g.label, ...g.items.map(i => i.label)]),
  ].join(' ').toLowerCase();
  for (const word of ['proof', 'illegal', 'violation', 'owed to you', 'your case']) {
    assert.equal(copy.includes(word), false, `"${word}" in a chip or step label`);
  }
});

test('the rights guide describes rules, not the reader’s entitlements', () => {
  // "you are owed" turns general information into a statement about this specific reader,
  // which is the line between information and advice.
  const prose = TOPICS.flatMap(t => [...t.paras, t.app].filter(Boolean)).join(' ');
  assert.equal(/\byou are owed\b/i.test(prose), false, 'say what the law requires, not what this reader is owed');
  assert.equal(/\byou are entitled\b/i.test(prose), false);
  assert.equal(/\byou have a (case|claim)\b/i.test(prose), false);
});

test('every rights topic still points somewhere real for actual advice', () => {
  const src = readFileSync('js/ui/rightsFaq.js', 'utf8');
  assert.match(src, /not legal advice about your situation/i);
  assert.match(src, /Labor Commissioner/);
});
