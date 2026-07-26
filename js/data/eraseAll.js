// eraseAll.js — remove every local trace of the user's records. One concern: the destructive
// path, in one place, so it can never half-happen.
//
// Move to Deleted is recoverable on purpose, which means until now nothing in the app could
// actually destroy a record: the only route was the browser's site-settings screen, buried in
// the OS. For someone who is about to hand the phone to a manager, or who logged something they
// need gone, "go find Chrome's site settings" is not a real answer to a promise that the records
// are theirs alone.
import { STORE_INCIDENTS, STORE_SETTINGS, tx, reqToPromise } from './db.js';
import { countIncidents } from './incidentRepo.js';

// Every key this app writes outside the database is namespaced. Clearing by prefix means a
// preference added later is erased too, without anyone having to remember to come back here.
const LOCAL_PREFIX = 'jobwarden.';

export async function eraseEverything() {
  const records = await countIncidents({ includeDeleted: true });
  await tx(STORE_INCIDENTS, 'readwrite', s => reqToPromise(s.clear()));
  // The settings store holds the profile, the workplaces AND the in-progress shift, so this
  // also stops a live timer rather than leaving one running against a profile that is gone.
  await tx(STORE_SETTINGS, 'readwrite', s => reqToPromise(s.clear()));
  try {
    // Walk backwards: removing an entry reindexes the ones after it, so a forward loop skips
    // every second match. Indexed access is the guaranteed way to enumerate a Storage.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_PREFIX)) localStorage.removeItem(key);
    }
  } catch { /* no storage access means there was nothing there to clear */ }
  return { records };
}
