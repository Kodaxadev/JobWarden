// The printable report and summary are generated HTML written into a same-origin window.
// Escaping is the first line of defence; the document's own CSP is the second, and it is
// the one that holds even if the first is wrong. A restored backup file is untrusted input,
// so these check both against content an attacker controls.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReportHtml } from '../js/export/exportReport.js';
import { buildSummaryHtml } from '../js/export/exportSummary.js';
import { REPORT_CSP } from '../js/export/reportBrand.js';
import { createIncident } from '../js/domain/incidentModel.js';

const HOSTILE = '"><script>alert(document.cookie)</script>';

const hostileRecord = () => createIncident({
  incidentDate: '2026-06-16', types: ['missed_meal'], clockIn: '08:00', clockOut: '17:00',
  workplace: HOSTILE,
  narrative: HOSTILE,
  witnesses: HOSTILE,
  notice: { to: HOSTILE, channel: HOSTILE, response: HOSTILE, adverseAction: HOSTILE },
  offClock: { task: HOSTILE, directedBy: HOSTILE },
  attachments: [
    { id: 'a1', name: HOSTILE, type: 'image/jpeg', size: 10, dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
    { id: 'a2', name: 'sneaky', type: 'text/html', size: 10, dataUrl: 'data:text/html;base64,PHNjcmlwdD4=' },
  ],
});

const BUILDERS = [['report', buildReportHtml], ['summary', buildSummaryHtml]];

for (const [name, build] of BUILDERS) {
  test(`the printable ${name} declares a script-free content policy`, async () => {
    const html = await build([hostileRecord()], { employeeName: 'Ana R.' });
    assert.ok(html.includes(`content="${REPORT_CSP}"`), 'the CSP meta tag must be present');
    const headEnd = html.indexOf('</head>');
    assert.ok(html.indexOf('Content-Security-Policy') < headEnd, 'the policy must come before the content it governs');
  });

  // The payload is expected to APPEAR in the output — a report should show what the worker
  // actually typed. What must never happen is it appearing anywhere a browser would treat as
  // markup: a tag, an attribute boundary, an event handler, or a javascript: URL.
  test(`the printable ${name} renders hostile record content as text, never as markup`, async () => {
    const html = await build([hostileRecord()], { employeeName: HOSTILE, employer: HOSTILE });
    assert.equal(/<script/i.test(html), false, 'no script tag may reach the document');
    assert.equal(/\son(?:error|load|click)\s*=/i.test(html), false, 'no event-handler attribute may be injected');
    assert.equal(/javascript:/i.test(html), false);
    assert.ok(html.includes('&lt;script&gt;alert(document.cookie)&lt;/script&gt;'),
      'the hostile text should still be visible to the reader, fully escaped');
  });
}

test('the policy itself forbids script, and allows only inline style and image data', () => {
  assert.match(REPORT_CSP, /default-src 'none'/);
  assert.match(REPORT_CSP, /script-src 'none'/);
  assert.match(REPORT_CSP, /object-src 'none'/);
  assert.match(REPORT_CSP, /base-uri 'none'/);
  assert.match(REPORT_CSP, /img-src data: blob:/);
  assert.equal(/script-src[^;]*'unsafe-inline'/.test(REPORT_CSP), false);
  assert.equal(REPORT_CSP.includes('"'), false, 'the policy is embedded in a double-quoted attribute');
});

test('a non-image attachment data URL is dropped, not inlined', async () => {
  const html = await buildReportHtml([hostileRecord()], {});
  assert.equal(html.includes('data:text/html'), false, 'only data:image/ may be inlined');
  assert.ok(html.includes('data:image/png'), 'a real photo still renders');
});

test('the report still says what it is and is not', async () => {
  const html = await buildReportHtml([hostileRecord()], {});
  assert.ok(html.includes('Not legal advice'));
  // The seal's limits travel with the seal. tests/disclaimers.test.mjs owns the exact
  // wording; this only checks the report did not drop it.
  assert.ok(html.includes('not a timestamp from any outside service'));
  assert.ok(html.includes('have not been verified'), 'whose account this is must be stated');
});

// A workplace name, a witness list and a narrative are whatever the worker typed. When one
// arrives as a long unbroken run — a pasted URL, an address with no spaces — the printed
// document has no scrollbar to rescue it: whatever sits past the right edge of the paper is
// simply not in the evidence. Both documents overflowed letter paper by 115px and 59px before
// these rules existed.
const UNBROKEN = 'Wolfeschlegelsteinhausenbergerdorffvoralternwarengewissenhaftschaferswesenchaftswarenwolkegemeinschaft';

const longRecord = () => createIncident({
  incidentDate: '2026-06-16', types: ['missed_meal'], clockIn: '08:00', clockOut: '17:00',
  workplace: UNBROKEN, witnesses: UNBROKEN, narrative: UNBROKEN,
});

const stylesheetOf = html => [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');

for (const [name, build] of BUILDERS) {
  test(`the printable ${name} keeps an unbroken run of user text inside the paper`, async () => {
    const css = stylesheetOf(await build([longRecord()], { employer: UNBROKEN }));

    // Every track that shares its width with a sibling must be able to reach zero. A bare 1fr
    // keeps an `auto` minimum, so one long value widens the track and drags the whole grid or
    // table past the page — the fault is in the track, not in the cell that exposed it.
    for (const [, value] of css.matchAll(/grid-template-columns:([^;}]+)/g)) {
      const outsideMinmax = value.replace(/minmax\([^)]*\)/g, '');
      assert.ok(!/\b1fr\b/.test(outsideMinmax),
        `grid-template-columns:${value.trim()} — a shared track needs minmax(0, 1fr), not a bare 1fr`);
    }

    // And the containers that actually receive that text need somewhere to break.
    const ruleFor = selector => css.split('}')
      .map(chunk => chunk.split('{'))
      .filter(parts => parts.length === 2 && parts[0].trim().split(/\s+/).pop() === selector)
      .map(parts => parts[1])[0];

    for (const sel of ['.narr', 'dd', 'th,td']) {
      const body = ruleFor(sel);
      if (!body) continue;   // not every document defines every one of these
      assert.match(body, /overflow-wrap:\s*anywhere|word-break:\s*break-all/,
        `${sel} holds user text and must be able to break inside a long run`);
    }
  });

  test(`the printable ${name} still contains the long value it had to wrap`, async () => {
    const html = await build([longRecord()], { employer: UNBROKEN });
    assert.ok(html.includes(UNBROKEN), 'wrapping must not come at the cost of dropping the text');
  });
}
