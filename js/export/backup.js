// backup.js — backup-due logic + reminder banner. One concern: nudging the user to back up.
// Data loss on a single device is the biggest practical risk for a local-first app.
import { el } from '../ui/dom.js';
import { icon } from '../ui/icons.js';

const iconEl = (name) => {
  const span = el('span');
  span.innerHTML = icon(name);
  return span.firstElementChild || span;
};

export function daysSince(iso) {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function backupDue(settings, count) {
  if (!count) return false;
  return daysSince(settings.lastBackupAt) >= (settings.backupReminderDays || 7);
}

// The header badge. It was hardcoded markup reading "Saved on this phone" in evidence green,
// which the footer already says permanently and which no code ever changed — a glowing dot
// reporting nothing. Worse, it was greenest in the state that most deserves concern: records
// on the device and no copy of them anywhere. The banner below only speaks once a backup is
// overdue, so for the first week the only signal was a badge saying all is well.
//
// It reports the good news only, and the banner below owns the bad. That split is not a
// preference: backupDue() is what raises the banner, so any warning here would appear only ever
// alongside a banner already saying it — and saying it better, with a button that fixes it.
// Two chrome elements repeating one sentence is how the old badge became wallpaper.
//
// So: silent while there is nothing to back up, silent while the banner is nagging, and
// otherwise the one thing a local-first record keeper wants confirmed at a glance — a copy
// exists, and this fresh.
export function backupStatus(settings, count) {
  if (!count) return null;                          // nothing saved yet, nothing to report
  if (backupDue(settings, count)) return null;      // the banner has this, with an action
  const days = daysSince(settings.lastBackupAt);
  return { tone: 'ok', label: days === 0 ? 'Backed up today' : `Backed up ${days}d ago` };
}

export function renderBackupStatus(host, { settings, count }) {
  host.replaceChildren();
  const state = backupStatus(settings, count);
  if (!state) return;
  host.appendChild(el('span', { class: `pill${state.tone === 'warn' ? ' pill-warn' : ''}` }, [
    el('span', { class: 'pill-dot', 'aria-hidden': 'true' }),
    el('span', { text: state.label }),
  ]));
}

export function renderBackupBanner(host, { settings, count, onBackupNow }) {
  host.replaceChildren();
  if (!backupDue(settings, count)) return;
  const since = settings.lastBackupAt ? `${daysSince(settings.lastBackupAt)}d ago` : 'never';
  host.appendChild(el('div', { class: 'banner' }, [
    el('span', { class: 'banner-icon' }, [iconEl('shield-alert')]),
    el('span', { class: 'banner-copy' }, [
      el('strong', { class: 'banner-title', text: 'Backup due' }),
      el('span', { class: 'banner-detail', text: `Only on this phone · Last backup ${since}` }),
    ]),
    el('button', { class: 'btn tiny', text: 'Back up now', onclick: onBackupNow }),
  ]));
}
