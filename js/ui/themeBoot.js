// themeBoot.js — the theme, before the first paint. One concern: no flash of the wrong theme.
// Loaded from <head> as its own tiny module (an inline script would need 'unsafe-inline' in the
// CSP, which this app does not grant). It imports nothing but themePref, so the data layer is
// not on the critical path.
import { paintTheme, readThemePref, resolveTheme } from './themePref.js';

paintTheme(resolveTheme(readThemePref()));
