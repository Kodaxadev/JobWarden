// storageErrors.js — turn a storage write failure into words a person can act on.
// One concern: explaining why a save failed and what can be done about it. No DOM.
//
// This matters more here than in most apps. A failed save is not a lost form, it is a lost
// record of something that already happened and cannot be re-observed — and the raw name
// ("QuotaExceededError") tells the user nothing. Every case names the same two facts first:
// the record was NOT saved, and what to do next.

/**
 * @typedef {object} StorageProblem
 * @property {string} kind        machine tag: 'full' | 'blocked' | 'closed' | 'unknown'
 * @property {string} title       short, plain, and true
 * @property {string} body        what happened and what to do, in that order
 * @property {boolean} canDropPhotos  true when retrying without photos is likely to work
 */

/** @param {any} err @returns {StorageProblem} */
export function explainStorageError(err) {
  const name = String(err?.name || '');
  const msg = String(err?.message || err || '');
  const says = (re) => re.test(name) || re.test(msg);

  if (name === 'QuotaExceededError' || says(/quota|storage full|exceeded the quota/i)) {
    return {
      kind: 'full',
      title: 'This phone is out of space',
      body: 'Your record was NOT saved. Photos take up the most room by far. You can save the record without its photos now and keep the facts, then free up space on the phone and add photos to it later.',
      canDropPhotos: true,
    };
  }

  if (name === 'SecurityError' || says(/indexeddb unavailable|not allowed|access is denied|blocked/i)) {
    return {
      kind: 'blocked',
      title: 'This browser is blocking storage',
      body: 'Your record was NOT saved. A private or incognito window, or a "block all cookies" setting, stops JobWarden from keeping anything. Open JobWarden in a normal window and enter it again.',
      canDropPhotos: false,
    };
  }

  if (name === 'InvalidStateError' || says(/database is closing|connection is closing|closed/i)) {
    return {
      kind: 'closed',
      title: 'The record could not be written',
      body: 'Your record was NOT saved, because the app’s storage was closing — usually another JobWarden tab updating. Close any other JobWarden tabs, then tap Save again.',
      canDropPhotos: false,
    };
  }

  return {
    kind: 'unknown',
    title: 'The record could not be saved',
    body: `Your record was NOT saved, and it is still on this screen — do not leave without trying again. If it keeps failing, write the facts down somewhere else now, and check Settings for the error log. (${name || 'error'}: ${msg.slice(0, 120)})`,
    canDropPhotos: true,
  };
}
