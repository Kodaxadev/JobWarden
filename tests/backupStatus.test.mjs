// The header badge used to be hardcoded markup reading "Saved on this phone" in evidence green.
// Nothing ever changed it, so it was greenest in the state that deserves concern most: records
// on the device with no copy of them anywhere. These tests pin the two rules that replaced it —
// it tells the truth, and it never talks over the banner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupStatus, backupDue, daysSince } from '../js/export/backup.js';

const DAY = 86400000;
const agoIso = (days) => new Date(Date.now() - days * DAY).toISOString();
const settings = (days) => ({ lastBackupAt: days === null ? '' : agoIso(days), backupReminderDays: 7 });

test('with nothing saved there is nothing to report', () => {
  assert.equal(backupStatus(settings(null), 0), null);
  assert.equal(backupStatus(settings(3), 0), null);
});

test('a current backup is reported, with its age', () => {
  assert.deepEqual(backupStatus(settings(0), 4), { tone: 'ok', label: 'Backed up today' });
  assert.deepEqual(backupStatus(settings(1), 4), { tone: 'ok', label: 'Backed up 1d ago' });
  assert.deepEqual(backupStatus(settings(6), 4), { tone: 'ok', label: 'Backed up 6d ago' });
});

test('the badge goes quiet the moment the banner speaks, and not before', () => {
  assert.equal(backupDue(settings(6), 4), false, 'day 6 is not yet due');
  assert.ok(backupStatus(settings(6), 4), 'so the badge still reports');

  assert.equal(backupDue(settings(7), 4), true, 'day 7 is due');
  assert.equal(backupStatus(settings(7), 4), null, 'so the badge yields to the banner');
});

// The reason the badge carries no warning state at all. If it did, the warning could only ever
// appear next to a banner already making the same point, with a button that acts on it.
test('the badge and the banner are never both present', () => {
  for (const count of [0, 1, 25]) {
    for (const days of [null, 0, 1, 6, 7, 8, 40, 400]) {
      const s = settings(days);
      const bothSpeak = backupDue(s, count) && backupStatus(s, count) !== null;
      assert.equal(bothSpeak, false,
        `count=${count} days=${days}: badge and banner would both be shown`);
    }
  }
});

test('never having backed up is the banner\'s case, whatever the reminder interval', () => {
  for (const backupReminderDays of [1, 7, 30, 365]) {
    const s = { lastBackupAt: '', backupReminderDays };
    assert.equal(daysSince(s.lastBackupAt), Infinity);
    assert.equal(backupDue(s, 3), true, `${backupReminderDays}d interval must still nag`);
    assert.equal(backupStatus(s, 3), null);
  }
});

// A green badge that outlived its own claim is what this replaced; don't reintroduce one.
test('the badge never claims a backup that is older than the reminder window', () => {
  for (const days of [7, 8, 15, 90, 900]) {
    assert.equal(backupStatus(settings(days), 2), null, `${days}d must not read as backed up`);
  }
});
