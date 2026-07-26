// settingsRepo.js — user/workplace settings. One concern: settings persistence.
import { STORE_SETTINGS, tx, reqToPromise } from './db.js';

const KEY = 'app';
const DEFAULTS = {
  key: KEY,
  employeeName: '',
  role: '',
  payType: '',           // never infer coverage; see config/payStatus.js for supported values
  employer: '',
  jurisdiction: 'CA',    // which state's rule set applies (California-only today)
  awsElection: '',       // alternative workweek schedule (e.g. 4/10): '' unknown | 'yes' | 'no'
  cbaCovered: '',        // covered by a collective bargaining agreement: '' | 'yes' | 'no'
  workplaces: [],        // [string] workplace names / locations
  lastBackupAt: '',
  backupReminderDays: 7,
  onboardedAt: '',       // ISO timestamp set once the first-run setup is completed
  disclaimerAckAt: '',   // when the user ticked "I understand" on first run
  disclaimerAckText: '', // the exact sentence they ticked, kept verbatim so it stays true
                         // even after the wording changes in a later build
  theme: 'dark',         // 'dark' (brand default) | 'light' | 'system'
};

export async function getSettings() {
  const s = await tx(STORE_SETTINGS, 'readonly', st => reqToPromise(st.get(KEY)));
  return { ...DEFAULTS, ...(s || {}) };
}

// Read and write inside ONE transaction. Reading first and writing after left a window where two
// overlapping saves both started from the same stored value and then both wrote it back, so the
// later one silently dropped the earlier one's change. That is reachable without trying: the
// theme saves the moment it is picked, and tapping "Save settings" right afterwards raced it.
// Marking a backup as done races the same way, and losing that revives the overdue banner.
export async function saveSettings(patch) {
  return tx(STORE_SETTINGS, 'readwrite', async st => {
    const stored = await reqToPromise(st.get(KEY));
    const next = { ...DEFAULTS, ...(stored || {}), ...patch, key: KEY };
    await reqToPromise(st.put(next));
    return next;
  });
}

export async function markBackedUp() {
  return saveSettings({ lastBackupAt: new Date().toISOString() });
}
