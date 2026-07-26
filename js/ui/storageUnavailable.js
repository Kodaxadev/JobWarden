// storageUnavailable.js — what the app says when it cannot open its own database.
// One concern: failing loudly and honestly instead of rendering an empty shell.
//
// Every screen reads from storage, so if the database will not open, nothing can render and
// nothing can be saved. Until now that produced a blank app behind a toast that vanished after
// two seconds — the worst possible outcome here, because a person can sit and type a record into
// a screen that has no way to keep it. The likely causes are all things this app's audience
// actually hits: a private or incognito window (a worker keeping the app out of normal browsing),
// "block all cookies", or a locked-down work device.
import { el, clear } from './dom.js';
import { emptyState } from './statusUi.js';
import { explainStorageError } from '../data/storageErrors.js';

export function renderStorageUnavailable(container, error, { onRetry } = {}) {
  const problem = explainStorageError(error);
  clear(container);
  // 'blocked' copy is written for a failed write ("Your record was NOT saved"), which is not what
  // happened here — nothing was ever entered. The cause and the remedy carry over; the opening
  // sentence has to be about the app, not a record.
  const cause = problem.kind === 'blocked'
    ? 'A private or incognito window, or a “block all cookies” setting, stops JobWarden from keeping anything on this phone.'
    : 'JobWarden could not open the storage it keeps your records in.';

  container.appendChild(el('section', { class: 'card storage-unavailable', role: 'alert' }, [
    emptyState({
      title: 'JobWarden cannot save on this phone',
      description: `${cause} Nothing you enter here would be kept, so the app has stopped rather than let you write a record it cannot store.`,
      iconName: 'shield-alert',
      actionLabel: onRetry ? 'Try again' : undefined,
      onAction: onRetry,
    }),
    el('p', { class: 'hint', text: 'Open JobWarden in a normal browser window, or allow this site to store data, then try again. Records you saved before are still there — this does not delete anything.' }),
    el('p', { class: 'hint storage-unavailable-detail', text: detailOf(error) }),
  ]));
}

// The raw reason, last and quiet: useless to most people, and the only thing that helps when
// someone reports the problem.
function detailOf(error) {
  const name = String(error?.name || '');
  const message = String(error?.message || error || 'unknown error');
  return `Reported by this browser: ${name ? `${name} — ` : ''}${message}`.slice(0, 300);
}
