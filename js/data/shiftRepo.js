// shiftRepo.js — the one in-progress shift. One concern: persisting the active shift so a
// live timer survives the app closing/reopening. Stored in the settings store under its own key.
import { STORE_SETTINGS, tx, reqToPromise } from './db.js';

const KEY = 'activeShift';

export async function getActiveShift() {
  const s = await tx(STORE_SETTINGS, 'readonly', st => reqToPromise(st.get(KEY)));
  return s || null;
}

export async function saveActiveShift(shift) {
  const next = { ...shift, key: KEY };
  await tx(STORE_SETTINGS, 'readwrite', st => reqToPromise(st.put(next)));
  return next;
}

export async function clearActiveShift() {
  await tx(STORE_SETTINGS, 'readwrite', st => reqToPromise(st.delete(KEY)));
}
