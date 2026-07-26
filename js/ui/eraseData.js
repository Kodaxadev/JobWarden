// eraseData.js — the "erase everything" control and the warning that guards it.
// One concern: letting a person destroy their own data on purpose, and knowing what it costs.
import { toast, withBusy } from './dom.js';
import { confirmDialog } from './confirmDialog.js';
import { actionRow } from './actionRow.js';
import { eraseEverything } from '../data/eraseAll.js';
import { countIncidents } from '../data/incidentRepo.js';
import { getSettings } from '../data/settingsRepo.js';
import { daysSince } from '../export/backup.js';

// Deliberately ONE dialog, not a gauntlet. Someone reaching for this may be minutes from
// handing the phone over; three screens of are-you-sure is its own kind of failure. What makes
// it safe is that the message counts what will go, says what it cannot reach, and the confirm
// button names the act instead of saying "OK" — and the dialog opens focused on Cancel.
export function eraseWarning({ records = 0, lastBackupAt = '' } = {}) {
  if (!records) {
    return {
      title: 'Clear this phone’s settings?',
      message: 'There are no records to delete. This clears your name, workplaces, and other settings, and returns the app to how it was before you first opened it.',
      confirmText: 'Clear settings',
      cancelText: 'Cancel',
    };
  }
  const days = daysSince(lastBackupAt);
  const backup = !Number.isFinite(days)
    ? 'You have never saved a backup, so there is no copy of these records anywhere else.'
    : days === 0
      ? 'Your last backup was saved today.'
      : `Your last backup was ${days} day${days === 1 ? '' : 's'} ago, so anything logged since then exists only here.`;
  const one = records === 1;
  const plural = one ? '' : 's';
  return {
    title: 'Erase everything on this phone?',
    message: `This permanently deletes ${records} record${plural}, ${one ? 'its' : 'their'} photos, and your settings.`
      + ` It cannot be undone. It does not reach backup files or emails you have already sent. ${backup}`,
    confirmText: `Erase ${records} record${plural}`,
    cancelText: one ? 'Keep my record' : 'Keep my records',
  };
}

// Returns the Settings row. `onErased` runs after the data is gone — the caller decides what the
// app should look like next (nothing on screen is true any more).
export function eraseDataAction({ onErased } = {}) {
  return actionRow({
    label: 'Erase everything on this phone',
    description: 'Permanently delete all records, photos, and settings. This cannot be undone.',
    iconName: 'trash-2',
    variant: 'destructive',
    onClick: async (btn) => {
      const [records, settings] = await Promise.all([
        countIncidents({ includeDeleted: true }),
        getSettings(),
      ]);
      const warning = eraseWarning({ records, lastBackupAt: settings.lastBackupAt });
      if (!await confirmDialog(warning.message, { ...warning, danger: true })) return;
      try {
        await withBusy(btn, 'Erasing…', eraseEverything);
      } catch (e) {
        toast('Could not erase everything: ' + (e?.message || e), { tone: 'error' });
        return;
      }
      onErased?.();
    },
  });
}
