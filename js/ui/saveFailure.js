// saveFailure.js — what the app does when a record will not save. One concern: making a
// failed write impossible to miss, and offering the one recovery that actually works.
//
// A toast is the wrong instrument here. It fades in under three seconds, and the user's very
// next act is to put the phone away believing the record is kept — which is exactly when the
// evidence is lost. So this blocks: the user has to acknowledge it, and where the cause is
// space, they get the trade that saves the facts (drop the photos, keep the record).
import { toast } from './dom.js';
import { confirmDialog } from './confirmDialog.js';
import { explainStorageError } from '../data/storageErrors.js';
import { logError } from '../data/errorLog.js';

/**
 * Report a failed save and, when it might help, retry without photos.
 * @param {any} err the error the write threw
 * @param {{attachments?: any[]}} draft the record that failed to save
 * @param {(draft: any) => Promise<any>} write the same write to retry with
 * @returns {Promise<{saved: boolean, droppedPhotos: number}>}
 */
export async function reportSaveFailure(err, draft, write) {
  const problem = explainStorageError(err);
  logError(`save failed (${problem.kind}): ${err?.name || ''} ${err?.message || err}`, 'save');

  const photos = (draft?.attachments || []).length;
  const canRetry = problem.canDropPhotos && photos > 0 && typeof write === 'function';

  if (!canRetry) {
    await confirmDialog(problem.body,
      {
        title: problem.title,
        confirmText: 'OK',
        cancelText: 'Copy the error',
        iconName: 'shield-alert',
      })
      || copyDiagnostics(problem, err);
    return { saved: false, droppedPhotos: 0 };
  }

  const drop = await confirmDialog(
    problem.body,
    {
      title: problem.title,
      confirmText: `Save without the ${photos === 1 ? 'photo' : `${photos} photos`}`,
      cancelText: 'Not now',
      iconName: 'shield-alert',
    },
  );
  if (!drop) return { saved: false, droppedPhotos: 0 };

  try {
    await write({ ...draft, attachments: [] });
    toast(`Saved without ${photos === 1 ? 'the photo' : 'the photos'} — the facts are kept`, {
      duration: 5000,
      tone: 'warning',
    });
    return { saved: true, droppedPhotos: photos };
  } catch (again) {
    logError(`save retry failed: ${again?.name || ''} ${again?.message || again}`, 'save');
    await confirmDialog(
      'Your record is still on this screen. Write the facts down somewhere else now — a note app or a text to yourself — then free up space and try again.',
      {
        title: 'The retry did not work',
        confirmText: 'OK',
        cancelText: 'Copy the error',
        iconName: 'shield-alert',
      },
    ) || copyDiagnostics(problem, again);
    return { saved: false, droppedPhotos: 0 };
  }
}

// Best-effort: hand the user something they can paste into a message asking for help.
// Nothing is sent anywhere — this is the clipboard, on their device.
function copyDiagnostics(problem, err) {
  const text = `JobWarden save failure\nkind: ${problem.kind}\nerror: ${err?.name || ''} ${err?.message || err}\nwhen: ${new Date().toISOString()}`;
  navigator.clipboard?.writeText(text).then(
    () => toast('Error details copied', { tone: 'success' }),
    () => toast('Could not copy — the details are in Settings → App health', { tone: 'error' }),
  );
}
