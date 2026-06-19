import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup } from '../js/export/importBackup.js';

test('parseBackup accepts a valid JobWarden backup', () => {
  const data = parseBackup(JSON.stringify({ app: 'JobWarden', schema: 2, records: [{ id: 'a' }, { id: 'b' }] }));
  assert.equal(data.records.length, 2);
});

test('parseBackup rejects unreadable or foreign files', () => {
  assert.throws(() => parseBackup('not json at all'), /not readable/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'SomethingElse', records: [] })), /not a JobWarden/);
  assert.throws(() => parseBackup(JSON.stringify({ app: 'JobWarden' })), /not a JobWarden/);
});
