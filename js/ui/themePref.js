// themePref.js — where the theme preference lives, and what colour the phone's own chrome
// takes. One concern: resolving and painting a theme.
//
// Split out of theme.js so the pre-paint applier (themeBoot.js) can read the preference
// WITHOUT pulling in the data layer. The preference of record is in IndexedDB, and a database
// cannot be opened before the first paint — which is why a light-theme launch used to flash
// the dark canvas. localStorage is a mirror, never the source of truth.
export const THEME_KEY = 'jobwarden.theme';

// The top edge of the header in each theme. The status bar then continues the app's own
// surface instead of sitting as a black band above a cream header (the light theme exists for
// reading in full sun; a black bar over it is the one place that still looked unfinished).
const CHROME_COLOR = { dark: '#0a0b0e', light: '#f7f3ea' };

export function resolveTheme(pref) {
  if (pref === 'light') return 'light';
  if (pref === 'system') return globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  return 'dark';
}

export function readThemePref() {
  try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch { return 'dark'; }
}

export function rememberThemePref(pref) {
  try { localStorage.setItem(THEME_KEY, pref); } catch { /* private mode — the database still has it */ }
}

// Apply an already-resolved theme. Runs from <head>, so it must not assume a <body> yet.
export function paintTheme(resolved) {
  document.documentElement.setAttribute('data-theme', resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', CHROME_COLOR[resolved] || CHROME_COLOR.dark);
}
