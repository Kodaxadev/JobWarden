// exportView.js — export & backup screen. One concern: export UI.
import { el, clear, toast, withBusy } from './dom.js';
import { confirmDialog } from './confirmDialog.js';
import { getAllIncidents } from '../data/incidentRepo.js';
import { getSettings, markBackedUp } from '../data/settingsRepo.js';
import { exportJson, exportEncryptedJson } from '../export/exportJson.js';
import { emailRecords } from '../export/emailExport.js';
import { importBackup, parseBackup } from '../export/importBackup.js';
import { isEncryptedBackup, decryptBackup } from '../export/backupCrypto.js';
import { choosePassphrase, askPassphrase } from './passphraseDialog.js';
import { exportCsv } from '../export/exportCsv.js';
import { openPrintReport } from '../export/exportReport.js';
import { openPrintSummary } from '../export/exportSummary.js';
import { actionRow } from './actionRow.js';
import { emptyState, statusRow, updateStatusRow } from './statusUi.js';
import {
  restoreApplyFailureCopy, restoreReadFailureCopy, restoreResultCopy,
} from './restoreStatus.js';

export async function renderExportView(container, { onChanged, onCreate } = {}) {
  clear(container);
  const [items, backupItems, settings] = await Promise.all([
    getAllIncidents(),
    getAllIncidents({ includeDeleted: true }),
    getSettings(),
  ]);
  const deletedCount = backupItems.length - items.length;
  // Every export does real work — deriving a key, inlining photos, building a document — so
  // each one says so on its own button rather than leaving the control looking dead.
  const guard = (busyLabel, fn) => async (btn) => {
    await withBusy(btn, busyLabel, fn);
  };
  const confirmPlainBackup = () => confirmDialog(
    'It includes active records, recoverable Deleted records, and photos. Anyone who receives or opens the file can read them.',
    {
      title: 'Share a readable backup?',
      confirmText: 'Continue',
      iconName: 'shield-alert',
    },
  );

  if (backupItems.length) container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Back up this phone' }),
    el('p', {
      class: 'hint',
      text: deletedCount
        ? `${items.length} active · ${deletedCount} recoverable in Deleted. Backups include both.`
        : `${items.length} active record${items.length === 1 ? '' : 's'}, saved on this phone only.`,
    }),
    el('div', { class: 'action-list' }, [
      actionRow({
        label: 'Share unencrypted backup',
        description: 'Send a complete readable copy through your phone’s share sheet.',
        iconName: 'message-square', variant: 'recommended',
        onClick:
        guard('Preparing…', async () => {
          if (!await confirmPlainBackup()) return;
          const r = await emailRecords(backupItems, settings);
          if (r !== 'cancelled') { await markBackedUp(); onChanged?.(); }
          toast(
            r === 'shared' ? 'Backup shared' : r === 'fallback' ? 'Backup saved — attach it in the email that opened' : 'Share canceled',
            { tone: r === 'shared' ? 'success' : 'neutral' },
          );
        }),
      }),
      actionRow({
        label: 'Save unencrypted backup',
        description: 'Download every record and photo in a readable file.',
        iconName: 'download',
        onClick:
        guard('Building backup…', async () => {
          if (!await confirmPlainBackup()) return;
          const n = await exportJson(backupItems, settings);
          await markBackedUp();
          toast(`Backed up ${n} record(s)`, { tone: 'success' });
          onChanged?.();
        }),
      }),
      actionRow({
        label: 'Save locked backup',
        description: 'Encrypt the full backup with a passphrase only you know.',
        iconName: 'lock', variant: 'secure',
        onClick:
        guard(null, async (btn) => {
          const pass = await choosePassphrase();
          if (!pass) return;
          // Busy starts after the passphrase dialog closes — that is when the key derivation
          // actually runs, and it is the couple of seconds the user would otherwise doubt.
          await withBusy(btn, 'Locking…', async () => {
            try {
              const n = await exportEncryptedJson(backupItems, settings, pass);
              await markBackedUp();
              toast(`Locked backup saved · ${n} record(s)`, { tone: 'success' });
              onChanged?.();
            } catch (e) { toast(e?.message || 'Could not lock the backup', { tone: 'error' }); }
          });
        }),
      }),
    ]),
  ]));

  if (items.length) container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Create reports' }),
    el('p', { class: 'hint', text: 'Reports use active records. Recoverable Deleted records stay only in backups.' }),
    el('div', { class: 'action-list' }, [
      actionRow({
        label: 'Make spreadsheet',
        description: 'Open a table in Excel, Numbers, or Google Sheets.',
        iconName: 'list',
        onClick: guard('Building…', async () => { exportCsv(items); toast('Spreadsheet saved', { tone: 'success' }); }),
      }),
      actionRow({
        label: 'Make printable report',
        description: 'Print or save a detailed PDF for an agency, lawyer, or HR.',
        iconName: 'clipboard-pen',
        onClick: guard('Building report…', async () => {
          const ok = await openPrintReport(items, settings);
          if (!ok) toast('Allow pop-ups to print', { tone: 'warning' });
        }),
      }),
      actionRow({
        label: 'Make summary report',
        description: 'Create a one-page pattern and timeline overview.',
        iconName: 'notebook-pen',
        onClick: guard('Building summary…', async () => {
          const ok = await openPrintSummary(items, settings);
          if (!ok) toast('Allow pop-ups to print', { tone: 'warning' });
        }),
      }),
    ]),
  ]));
  else if (!backupItems.length) container.appendChild(el('section', { class: 'card export-empty-card' }, [
    el('h2', { text: 'Export & back up' }),
    emptyState({
      title: 'Nothing to export yet',
      description: 'Save a record first, or restore an existing backup below.',
      iconName: 'download',
      actionLabel: 'Log a record',
      onAction: onCreate,
      compact: true,
      headingLevel: 3,
    }),
  ]));

  // Restore — the counterpart to backup. Not guarded by record count (the user may be restoring
  // onto a fresh install with nothing here yet).
  const fileInput = el('input', { type: 'file', accept: 'application/json,.json,.jwbk' });
  fileInput.style.display = 'none';
  const restoreState = statusRow({
    label: 'No backup selected',
    detail: 'Choose a JobWarden backup file to begin.',
    iconName: 'rotate-ccw',
    live: true,
  });
  const restoreStatusHost = el('div', {
    class: 'status-list restore-status-list',
    hidden: true,
  }, [restoreState]);
  const showRestoreStatus = copy => {
    restoreStatusHost.hidden = false;
    updateStatusRow(restoreState, copy);
  };

  // Read either kind of backup: plain JSON, or a locked file the user unlocks here.
  // Returns the backup text, or null when the user backs out. A typo re-asks in place —
  // someone restoring evidence onto a new phone should not have to walk the file picker
  // again for a mistyped character.
  async function readBackupText(file) {
    const buffer = await file.arrayBuffer();
    if (!isEncryptedBackup(buffer)) return new TextDecoder().decode(buffer);
    for (let attempt = 0; ; attempt++) {
      const pass = await askPassphrase(attempt > 0);
      if (!pass) return null;
      toast('Unlocking…', 8000);
      try { return await decryptBackup(buffer, pass); }
      catch (e) { if (attempt >= 4) throw e; }
    }
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    showRestoreStatus({
      label: 'Reading backup',
      detail: file.name || 'Checking the selected file…',
      iconName: 'rotate-ccw',
      tone: 'loading',
    });
    let text, parsed;
    try {
      text = await readBackupText(file);
      if (text == null) {
        showRestoreStatus({
          label: 'Restore canceled',
          detail: 'Nothing on this phone was changed.',
          iconName: 'rotate-ccw',
          tone: 'neutral',
        });
        return;
      }
      parsed = parseBackup(text);
    }
    catch (e) {
      showRestoreStatus(restoreReadFailureCopy(e?.message));
      return;
    }
    showRestoreStatus({
      label: 'Backup ready to review',
      detail: `${parsed.records.length} record${parsed.records.length === 1 ? '' : 's'} found. Nothing has changed yet.`,
      iconName: 'rotate-ccw',
      tone: 'neutral',
    });
    if (!await confirmDialog(
      `This adds ${parsed.records.length} record(s). Your current records stay, and duplicates are skipped.`,
      {
        title: 'Restore this backup?',
        confirmText: 'Restore',
        iconName: 'rotate-ccw',
      },
    )) {
      showRestoreStatus({
        label: 'Restore canceled',
        detail: 'Nothing on this phone was changed.',
        iconName: 'rotate-ccw',
        tone: 'neutral',
      });
      return;
    }
    showRestoreStatus({
      label: 'Restoring backup',
      detail: 'Keeping current records and skipping duplicates…',
      iconName: 'rotate-ccw',
      tone: 'loading',
    });
    try {
      const r = await importBackup(text);
      showRestoreStatus(restoreResultCopy(r));
      onChanged?.();
    } catch (e) {
      showRestoreStatus(restoreApplyFailureCopy(e?.message));
    }
  });

  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Restore from a backup' }),
    el('p', { class: 'hint', text: 'Bring records back from a backup file — after reinstalling or on a new phone. Plain or locked files both work; a locked one will ask for its passphrase. Adds to what is here; duplicates are skipped.' }),
    el('div', { class: 'action-list compact' }, [
      actionRow({
        label: 'Choose a backup file',
        description: 'Plain and passphrase-locked JobWarden files are supported.',
        iconName: 'rotate-ccw',
        onClick: () => fileInput.click(),
      }),
    ]),
    restoreStatusHost,
    fileInput,
  ]));
}
