// exportView.js — export & backup screen. One concern: export UI.
import { el, clear, toast, confirmDialog } from './dom.js';
import { getAllIncidents } from '../data/incidentRepo.js';
import { getSettings, markBackedUp } from '../data/settingsRepo.js';
import { exportJson } from '../export/exportJson.js';
import { emailRecords } from '../export/emailExport.js';
import { importBackup, parseBackup } from '../export/importBackup.js';
import { exportCsv } from '../export/exportCsv.js';
import { openPrintReport } from '../export/exportReport.js';
import { openPrintSummary } from '../export/exportSummary.js';

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
      action('Email to myself', 'Opens your email with a summary + the backup file attached — the fastest way to keep a copy off this phone.', 'btn primary',
        guard(async () => {
          const r = await emailRecords(items, settings);
          if (r !== 'cancelled') { await markBackedUp(); onChanged?.(); }
          toast(r === 'shared' ? 'Shared ✓' : r === 'fallback' ? 'Opening email — attach the saved file' : 'Email canceled');
        })),
      action('Save full backup', 'Download a complete copy with photos to this device.', 'btn',
        guard(async () => { const n = await exportJson(items, settings); await markBackedUp(); toast(`Backed up ${n} record(s)`); onChanged?.(); })),
      action('Make spreadsheet', 'A table you can open in Excel or Google Sheets.', 'btn',
        guard(async () => { exportCsv(items); toast('Spreadsheet saved'); })),
      action('Make printable report', 'A report to print or save as PDF for the Labor Commissioner, a lawyer, or HR.', 'btn',
        guard(async () => { const ok = await openPrintReport(items, settings); if (!ok) toast('Allow pop-ups to print'); })),
      action('Make summary report', 'A one-page overview — the patterns and a timeline — a lawyer can read in 30 seconds.', 'btn',
        guard(async () => { const ok = await openPrintSummary(items, settings); if (!ok) toast('Allow pop-ups to print'); })),
    ]),
  ]));

  // Restore — the counterpart to backup. Not guarded by record count (the user may be restoring
  // onto a fresh install with nothing here yet).
  const fileInput = el('input', { type: 'file', accept: 'application/json,.json' });
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    let text, parsed;
    try { text = await file.text(); parsed = parseBackup(text); }
    catch (e) { return toast(e.message || 'Could not read that file'); }
    if (!await confirmDialog(`Restore ${parsed.records.length} record(s) from this backup? Your current records stay; duplicates are skipped.`, { confirmText: 'Restore', danger: false })) return;
    try {
      const r = await importBackup(text);
      toast(`Restored ${r.added} · skipped ${r.skipped} duplicate(s)` + (r.changed ? ` · ${r.changed} fingerprint warning(s)` : ''));
      onChanged?.();
    } catch (e) { toast('Could not restore: ' + (e?.message || e)); }
  });

  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Restore from a backup' }),
    el('p', { class: 'hint', text: 'Bring records back from a backup file — after reinstalling or on a new phone. Adds to what is here; duplicates are skipped.' }),
    el('div', { class: 'actions' }, [el('button', { class: 'btn', text: 'Choose a backup file', onclick: () => fileInput.click() })]),
    fileInput,
  ]));
}
