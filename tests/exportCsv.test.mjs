import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv, cell } from '../js/export/exportCsv.js';
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

test('buildCsv emits a header plus one row per incident, injection-safe', () => {
  const i = createIncident({ incidentDate: '2026-06-16', types: ['interrupted_meal'], narrative: '=HYPERLINK("evil")', meal: { interrupted: true } });
  const csv = buildCsv([i]);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith('Date,Workplace,Issues'));
  assert.ok(csv.includes("'=HYPERLINK")); // narrative was neutralized
});
