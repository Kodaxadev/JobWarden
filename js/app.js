// app.js — bootstrap + view routing. One concern: app shell orchestration.
import { openDb, requestPersistence } from './data/db.js';
import { getSettings, markBackedUp } from './data/settingsRepo.js';
import { countIncidents, getAllIncidents } from './data/incidentRepo.js';
import { renderCaptureForm } from './capture/captureForm.js';
import { renderIncidentList } from './ui/incidentList.js';
import { renderExportView } from './ui/exportView.js';
import { renderSettingsView } from './ui/settingsView.js';
import { renderBackupBanner } from './export/backup.js';
import { exportJson } from './export/exportJson.js';
import { qs, toast } from './ui/dom.js';

const main = qs('#view');
const bannerHost = qs('#banner');
const tabs = [...document.querySelectorAll('.tab')];

async function refreshBanner() {
  const [settings, count] = await Promise.all([getSettings(), countIncidents()]);
  renderBackupBanner(bannerHost, { settings, count, onBackupNow: quickBackup });
}

async function quickBackup() {
  const [items, settings] = await Promise.all([getAllIncidents(), getSettings()]);
  if (!items.length) return toast('Nothing to back up');
  await exportJson(items, settings);
  await markBackedUp();
  toast('Backed up ✓');
  refreshBanner();
}

function setActive(name) { tabs.forEach(t => t.classList.toggle('active', t.dataset.view === name)); }

async function show(name, opts = {}) {
  setActive(name);
  main.scrollTop = 0;
  if (name === 'log') {
    await renderCaptureForm(main, { existing: opts.existing, onSaved: () => { refreshBanner(); show('records'); } });
  } else if (name === 'records') {
    await renderIncidentList(main, {
      onEdit: it => show('log', { existing: it }),
      onChanged: () => { refreshBanner(); show('records'); },
    });
  } else if (name === 'export') {
    await renderExportView(main, { onChanged: refreshBanner });
  } else if (name === 'settings') {
    await renderSettingsView(main);
  }
}

tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.view)));

async function boot() {
  try { await openDb(); requestPersistence(); }
  catch (e) { toast('Storage unavailable: ' + (e?.message || e)); }
  await refreshBanner();
  await show('log');
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
boot();
