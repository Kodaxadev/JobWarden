// theme.js — resolve + apply the color theme. One concern: theme application.
// Dark is the brand default (the sealed-ledger). Light is for reading in bright sun or on a
// dim cheap screen. System follows the OS. "System" is resolved to an explicit data-theme in
// JS so the CSS needs only one light block (no media-query duplication).
import { getSettings, saveSettings } from '../data/settingsRepo.js';
import { paintTheme, rememberThemePref, resolveTheme } from './themePref.js';

const lightMq = () => window.matchMedia('(prefers-color-scheme: light)');

export function applyTheme(pref) {
  // Mirror the preference so the NEXT launch can paint it from <head>, before the database it
  // actually lives in has opened — otherwise a light-theme app flashes dark on every open.
  rememberThemePref(pref);
  paintTheme(resolveTheme(pref));
}

let _bound = false;
// In System mode, follow live OS changes.
export function watchSystemTheme() {
  if (_bound) return;
  _bound = true;
  lightMq().addEventListener?.('change', async () => {
    const s = await getSettings();
    if ((s.theme || 'dark') === 'system') applyTheme('system');
  });
}

export async function setTheme(pref) {
  await saveSettings({ theme: pref });
  applyTheme(pref);
}
