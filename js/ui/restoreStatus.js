// restoreStatus.js — plain-language results for backup restore.
// One concern: say what changed, what did not, and what the person should do next.
export function restoreReadFailureCopy(message = '') {
  const foreign = /not a JobWarden backup/i.test(message);
  return {
    label: foreign ? 'This file is not a JobWarden backup' : 'This backup could not be read',
    detail: foreign
      ? 'Choose a .json or .jwbk file created by JobWarden.'
      : `${message || 'Choose the file again and try once more.'}`,
    iconName: 'circle-alert',
    tone: 'error',
  };
}

export function restoreApplyFailureCopy(message = '') {
  return {
    label: 'Restore did not finish',
    detail: message
      ? `${message} Check Records, then choose the backup and try again.`
      : 'Some records may already be in Records. Check there, then choose the backup and try again.',
    iconName: 'circle-alert',
    tone: 'error',
  };
}

export function restoreResultCopy({ added = 0, skipped = 0, changed = 0, unreadable = 0 } = {}) {
  // Records the app could not read are evidence the person believes they just got back and did
  // not. That outranks a fingerprint warning, and the useful instruction is to keep the file:
  // the records are still in it, and nothing here has removed them.
  if (unreadable) return {
    label: added ? 'Restored, but part of the file could not be read' : 'No records could be read from this backup',
    detail: `${added} record${added === 1 ? '' : 's'} added · ${unreadable} could not be read.`
      + ' Keep this backup file — those records are still in it.',
    iconName: 'triangle-alert',
    tone: added ? 'warning' : 'error',
  };
  if (changed) return {
    label: 'Restored with a fingerprint warning',
    detail: `${added} added · ${skipped} duplicate${skipped === 1 ? '' : 's'} skipped · review ${changed} changed record${changed === 1 ? '' : 's'} in Records.`,
    iconName: 'triangle-alert',
    tone: 'warning',
  };
  if (!added) return {
    label: 'Nothing new to restore',
    detail: `${skipped} record${skipped === 1 ? ' is' : 's are'} already on this phone.`,
    iconName: 'circle-check',
    tone: 'neutral',
  };
  return {
    label: 'Backup restored',
    detail: `${added} record${added === 1 ? '' : 's'} added · ${skipped} duplicate${skipped === 1 ? '' : 's'} skipped.`,
    iconName: 'circle-check',
    tone: 'success',
  };
}
