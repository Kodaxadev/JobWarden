// deletedRecords.js — the recoverable "Deleted" area on Records.
// One concern: getting a soft-deleted record back, or finally getting rid of it.
//
// Deleting a record moves it here rather than destroying it, which is right — a mis-tap must
// never cost evidence. But nothing used to empty this drawer: a record logged by mistake stayed
// on the phone for good and went into every backup, where it sat next to the real ones in
// anything handed to a lawyer. "Delete forever" is the way out, and it says plainly what it
// cannot reach.
import { el, toast } from './dom.js';
import { icon } from './icons.js';
import { confirmDialog } from './confirmDialog.js';
import { deleteIncident, putIncident } from '../data/incidentRepo.js';
import { restoreIncident } from '../domain/incidentModel.js';
import { labelFor } from '../config/infractionTypes.js';
import { formatDate } from '../domain/timeUtils.js';

const iconEl = (n) => { const s = el('span'); s.innerHTML = icon(n); return s.firstElementChild || s; };

const chipRow = (item) => el('div', { class: 'row-chips' },
  (item.types || []).map(t => el('span', { class: 'chip mini', text: labelFor(t) })));

export function confirmForeverCopy() {
  return {
    message: 'This removes the record and its photos from this phone for good. It cannot be undone,'
      + ' and backup files you already saved still contain it.',
    title: 'Delete this record forever?',
    confirmText: 'Delete forever',
    cancelText: 'Keep it in Deleted',
    danger: true,
  };
}

function deletedRow(item, { onChanged }) {
  const restore = el('button', {
    class: 'btn tiny deleted-restore',
    onclick: async () => {
      await putIncident(restoreIncident(item));
      toast('Record restored to Records', { tone: 'success' });
      onChanged?.();
    },
  }, [iconEl('rotate-ccw'), document.createTextNode(' Restore record')]);

  const forever = el('button', {
    class: 'btn tiny danger deleted-purge',
    onclick: async () => {
      const { message, ...options } = confirmForeverCopy();
      if (!await confirmDialog(message, options)) return;
      await deleteIncident(item.id);
      toast('Record deleted forever', { tone: 'warning' });
      onChanged?.();
    },
  }, [iconEl('trash-2'), document.createTextNode(' Delete forever')]);

  return el('article', { class: 'row deleted' }, [
    el('div', { class: 'row-head static' }, [
      el('div', { class: 'row-main' }, [
        el('div', { class: 'row-date', text: formatDate(item.incidentDate) }),
        chipRow(item),
      ]),
      el('div', { class: 'deleted-actions' }, [restore, forever]),
    ]),
  ]);
}

// Open when there is nothing else on the screen — then this drawer IS the screen.
export function deletedSection(deleted, { onChanged } = {}) {
  const wrap = el('details', { class: 'deleted-wrap', open: !!deleted.openByDefault }, [
    // The app's own caret, not the browser's triangle — this and the edit history were the last
    // two disclosures still showing an unstyled UA marker next to five that don't.
    el('summary', { class: 'quiet-summary' }, [
      el('span', { text: `Deleted (${deleted.items.length}) — recoverable` }),
      el('span', { class: 'quiet-summary-chevron' }, [iconEl('chevron-down')]),
    ]),
  ]);
  deleted.items.forEach(d => wrap.appendChild(deletedRow(d, { onChanged })));
  return wrap;
}
