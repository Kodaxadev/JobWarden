// settingsRepo.js — user/workplace settings. One concern: settings persistence.
import { STORE_SETTINGS, tx, reqToPromise } from './db.js';

const KEY = 'app';
const DEFAULTS = {
  key: KEY,
  employeeName: '',
  role: 'Cashier / Admin (BDC)',
  payType: 'hourly',     // confirmed non-exempt hourly. 'salary_exempt' | 'commission' | ''
  employer: 'Penske Automotive Group',
  workplaces: [],        // [string] dealership names / locations
  lastBackupAt: '',
  backupReminderDays: 7,
  onboardedAt: '',       // ISO timestamp set once the first-run setup is completed
};

export async function getSettings() {
  const s = await tx(STORE_SETTINGS, 'readonly', st => reqToPromise(st.get(KEY)));
  return { ...DEFAULTS, ...(s || {}) };
}

export async function saveSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch, key: KEY };
  await tx(STORE_SETTINGS, 'readwrite', st => reqToPromise(st.put(next)));
  return next;
}

export async function markBackedUp() {
  return saveSettings({ lastBackupAt: new Date().toISOString() });
}
