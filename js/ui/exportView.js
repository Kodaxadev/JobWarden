// exportView.js — export & backup screen. One concern: export UI.
import { el, clear, toast } from './dom.js';
import { getAllIncidents } from '../data/incidentRepo.js';
import { getSettings, markBackedUp } from '../data/settingsRepo.js';
import { exportJson } from '../export/exportJson.js';
import { exportCsv } from '../export/exportCsv.js';
import { openPrintReport } from '../export/exportReport.js';

const action = (label, desc, cls, onclick) => el('div', { class: 'action' }, [
  el('button', { class: cls, text: label, onclick }),
  el('p', { class: 'hint', text: desc }),
]);

export async function renderExportView(container, { onChanged } = {}) {
  clear(container);
  const [items, settings] = await Promise.all([getAllIncidents(), getSettings()]);
  const guard = fn => async () => { if (!items.length) return toast('No records yet'); await fn(); };

  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Export & back up' }),
    el('p', { class: 'hint', text: `${items.length} record${items.length === 1 ? '' : 's'}, saved on this phone only.` }),
    el('div', { class: 'btn-col' }, [
      action('Save full backup', 'A complete copy with photos. Email it to yourself so a copy is off this phone.', 'btn primary',
        guard(async () => { const n = await exportJson(items, settings); await markBackedUp(); toast(`Backed up ${n} record(s)`); onChanged?.(); })),
      action('Make spreadsheet', 'A table you can open in Excel or Google Sheets.', 'btn',
        guard(async () => { exportCsv(items); toast('Spreadsheet saved'); })),
      action('Make printable report', 'A report to print or save as PDF for the Labor Commissioner, a lawyer, or HR.', 'btn',
        guard(async () => { const ok = await openPrintReport(items, settings); if (!ok) toast('Allow pop-ups to print'); })),
    ]),
  ]));
}
