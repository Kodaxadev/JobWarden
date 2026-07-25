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

export function restoreResultCopy({ added = 0, skipped = 0, changed = 0 } = {}) {
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
