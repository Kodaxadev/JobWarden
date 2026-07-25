import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv, cell } from '../js/export/exportCsv.js';
import { CSV_PREAMBLE } from '../js/config/disclaimers.js';
import { createIncident } from '../js/domain/incidentModel.js';

test('cell neutralizes formula-injection lead characters (CWE-1236)', () => {
  assert.equal(cell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(cell('+1'), "'+1");
  assert.equal(cell('-2'), "'-2");
  assert.equal(cell('@cmd'), "'@cmd");
  assert.equal(cell('normal text'), 'normal text');
});

test('cell escapes commas, quotes, and newlines', () => {
  assert.equal(cell('a,b'), '"a,b"');
  assert.equal(cell('she said "hi"'), '"she said ""hi"""');
  assert.equal(cell('line1\nline2'), '"line1\nline2"');
});

const injectionRecord = () => createIncident({
  incidentDate: '2026-06-16', types: ['interrupted_meal'],
  narrative: '=HYPERLINK("evil")', meal: { interrupted: true },
});

test('buildCsv emits a header plus one row per incident, injection-safe', () => {
  // preamble:false is the clean-dataset form — header first, one row per record.
  const csv = buildCsv([injectionRecord()], { preamble: false });
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith('Date,Workplace,Issues'));
  assert.ok(csv.includes("'=HYPERLINK")); // narrative was neutralized
});

// A spreadsheet is the export most likely to be forwarded and read by someone who never saw
// the app. It has to carry the framing, and the notes must not themselves become a formula.
test('the default CSV leads with whose account it is, then the header', () => {
  const lines = buildCsv([injectionRecord()]).split('\r\n');
  const headerAt = lines.findIndex(l => l.startsWith('Date,Workplace,Issues'));
  assert.ok(headerAt >= CSV_PREAMBLE.length, 'the notes must come before the header');
  const notes = lines.slice(0, headerAt).join(' ');
  assert.match(notes, /own account/i);
  assert.match(notes, /not verified by anyone/i);
  assert.match(notes, /not a finding that any rule was broken/i);
  assert.equal(lines.length - headerAt, 2, 'still exactly one data row after the header');
});

test('the "Findings" column no longer reads as a column of determinations', () => {
  const header = buildCsv([injectionRecord()]).split('\r\n').find(l => l.startsWith('Date,Workplace'));
  assert.equal(header.includes(',Findings,'), false, 'the bare word invites the wrong reading');
  assert.match(header, /pointers, not determinations/);
});

test('every preamble line is CSV-escaped, so a note can never become a formula', () => {
  for (const line of CSV_PREAMBLE) {
    assert.equal(/^[=+\-@\t\r]/.test(line), false, `preamble line would trigger a formula: ${line}`);
    assert.equal(cell(line).includes('\n'), false);
  }
});
