import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { locationFailureReason } from '../js/capture/geo.js';
import { locationStatusCopy, photoStatusCopy } from '../js/capture/evidenceStatus.js';
import {
  restoreApplyFailureCopy, restoreReadFailureCopy, restoreResultCopy,
} from '../js/ui/restoreStatus.js';

test('location failures keep denial, timeout, and unavailability distinct', () => {
  assert.equal(locationFailureReason({ code: 1 }), 'denied');
  assert.equal(locationFailureReason({ code: 3 }), 'timeout');
  assert.equal(locationFailureReason({ code: 2 }), 'unavailable');
  assert.match(locationStatusCopy('denied').text, /browser settings/);
  assert.match(locationStatusCopy('unsupported').text, /still save/);
});

test('photo status names partial and complete failure without blocking the record', () => {
  assert.equal(photoStatusCopy(0).text, 'No photos added.');
  assert.match(photoStatusCopy(2, 1).text, /2 photos added/);
  assert.match(photoStatusCopy(0, 1).text, /No photos were added/);
});

test('restore results say what changed and where a warning needs review', () => {
  assert.equal(restoreResultCopy({ added: 2, skipped: 0 }).label, 'Backup restored');
  assert.equal(restoreResultCopy({ added: 0, skipped: 2 }).label, 'Nothing new to restore');
  const warning = restoreResultCopy({ added: 1, skipped: 2, changed: 1 });
  assert.equal(warning.tone, 'warning');
  assert.match(warning.detail, /review 1 changed record in Records/);
  assert.match(restoreReadFailureCopy('That is not a JobWarden backup file.').detail, /\.jwbk/);
  assert.match(restoreApplyFailureCopy().detail, /Some records may already be in Records/);
});

test('every full backup path includes recoverable Deleted records', () => {
  const app = readFileSync('js/app.js', 'utf8');
  const exportView = readFileSync('js/ui/exportView.js', 'utf8');
  assert.match(app, /getAllIncidents\(\{ includeDeleted: true \}\)/);
  assert.match(app, /countIncidents\(\{ includeDeleted: true \}\)/);
  assert.match(exportView, /getAllIncidents\(\{ includeDeleted: true \}\)/);
  assert.match(exportView, /exportJson\(backupItems/);
  assert.match(exportView, /exportEncryptedJson\(backupItems/);
  assert.match(exportView, /emailRecords\(backupItems/);
});
