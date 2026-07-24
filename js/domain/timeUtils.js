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

// Whole minutes from start to end. If end is earlier on the clock (overnight shift), the
// end time is rolled to the NEXT CALENDAR DAY rather than having a flat 24h added — on a
// DST-transition night a real day is 23 or 25 hours, and a worker is owed the hours they
// actually worked. 10pm→6am is 8h normally, 7h across spring-forward, 9h across fall-back.
export function minutesBetween(start, end) {
  if (!start || !end) return null;
  const target = end < start ? nextDay(end) : end;
  return Math.round((target - start) / MS_PER_MIN);
}

// Same wall-clock time, one calendar day later, in local time. (A wall-clock time that
// does not exist on that day — the spring-forward gap — normalizes forward, as it should.)
function nextDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1,
    d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
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
