// theme.js — resolve + apply the color theme. One concern: theme application.
// Dark is the brand default (the sealed-ledger). Light is for reading in bright sun or on a
// dim cheap screen. System follows the OS. "System" is resolved to an explicit data-theme in
// JS so the CSS needs only one light block (no media-query duplication).
import { getSettings, saveSettings } from '../data/settingsRepo.js';

const lightMq = () => window.matchMedia('(prefers-color-scheme: light)');

function resolve(pref) {
  if (pref === 'light') return 'light';
  if (pref === 'system') return lightMq().matches ? 'light' : 'dark';
  return 'dark';
}

export function applyTheme(pref) {
  document.documentElement.setAttribute('data-theme', resolve(pref));
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
