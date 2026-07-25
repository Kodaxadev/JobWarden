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
