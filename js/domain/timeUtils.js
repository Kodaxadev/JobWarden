// timeUtils.js — pure date/time helpers. One concern: time math & formatting.
// No DOM, no storage. All times are interpreted in the device's local timezone.

const MS_PER_MIN = 60000;

export function localTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }
  catch { return ''; }
}

export function nowIso() { return new Date().toISOString(); }

// Combine 'YYYY-MM-DD' + 'HH:MM' (local) into a Date. Returns null if either missing/invalid.
export function combine(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const [hh, mm] = String(timeStr).split(':').map(Number);
  if ([y, m, d, hh, mm].some(n => Number.isNaN(n))) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

// Whole minutes from start to end. If end is earlier (overnight shift), add 24h.
export function minutesBetween(start, end) {
  if (!start || !end) return null;
  let diff = (end - start) / MS_PER_MIN;
  if (diff < 0) diff += 24 * 60; // crossed midnight
  return Math.round(diff);
}

export function formatDuration(mins) {
  if (mins == null) return '—';
  const sign = mins < 0 ? '-' : '';
  const a = Math.abs(mins);
  const h = Math.floor(a / 60);
  const m = a % 60;
  if (h && m) return `${sign}${h}h ${m}m`;
  if (h) return `${sign}${h}h`;
  return `${sign}${m}m`;
}

// Net hours worked = span(clockIn..clockOut) minus unpaid meal minutes.
export function hoursWorked(clockIn, clockOut, unpaidMealMins = 0) {
  const span = minutesBetween(clockIn, clockOut);
  if (span == null) return null;
  const net = Math.max(0, span - (unpaidMealMins || 0));
  return net / 60;
}

export function todayDateStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function nowTimeStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Human label for a 'YYYY-MM-DD' string, in local time, no timezone shift surprises.
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}
