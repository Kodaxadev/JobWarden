// errorLog.js — a tiny local ring buffer of recent errors. One concern: support visibility.
// When a user says "it's broken," there's otherwise no way to know what happened. Kept in
// localStorage (local-only, never sent anywhere), capped, and viewable/copyable in Settings.
const KEY = 'jobwarden.errorlog';
const MAX = 20;

export function logError(message, context = '') {
  try {
    const list = readErrors();
    list.push({
      at: new Date().toISOString(),
      message: String(message ?? 'error').slice(0, 500),
      context: String(context || '').slice(0, 160),
    });
    while (list.length > MAX) list.shift();
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* logging must never throw */ }
}

export function readErrors() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function clearErrors() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// A plain-text dump the user can copy into a support message.
export function errorLogText() {
  const list = readErrors();
  if (!list.length) return 'No recent errors.';
  return list.map(e => `${e.at} — ${e.message}${e.context ? ` (${e.context})` : ''}`).join('\n');
}
