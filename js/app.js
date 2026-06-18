// app.js — bootstrap + view routing. One concern: app shell orchestration.
import { openDb, requestPersistence } from './data/db.js';
import { getSettings, markBackedUp } from './data/settingsRepo.js';
import { countIncidents, getAllIncidents } from './data/incidentRepo.js';
import { renderCaptureForm } from './capture/captureForm.js';
import { renderIncidentList } from './ui/incidentList.js';
import { renderExportView } from './ui/exportView.js';
import { renderSettingsView } from './ui/settingsView.js';
import { renderOnboarding } from './ui/onboarding.js';
import { renderBackupBanner } from './export/backup.js';
import { exportJson } from './export/exportJson.js';
import { qs, clear, toast } from './ui/dom.js';

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

function setActive(name) {
  tabs.forEach(t => {
    const on = t.dataset.view === name;
    t.classList.toggle('active', on);
    if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
}

async function show(name, opts = {}) {
  setActive(name);
  main.scrollTop = 0;
  if (name === 'log') {
    await renderCaptureForm(main, { existing: opts.existing, template: opts.template, onSaved: () => { refreshBanner(); show('records'); } });
  } else if (name === 'records') {
    await renderIncidentList(main, {
      onEdit: it => show('log', { existing: it }),
      onRepeat: it => show('log', { template: it }),
      onChanged: () => { refreshBanner(); show('records'); },
    });
  } else if (name === 'export') {
    await renderExportView(main, { onChanged: refreshBanner });
  } else if (name === 'settings') {
    await renderSettingsView(main);
  }
}

tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.view)));

// First-run setup: only when the profile was never confirmed AND there are no records
// (so existing users are never sent back through onboarding).
async function showOnboarding() {
  document.body.classList.add('onboarding');
  setActive('log');
  clear(bannerHost);
  main.scrollTop = 0;
  await renderOnboarding(main, {
    onDone: async () => {
      document.body.classList.remove('onboarding');
      await refreshBanner();
      await show('log');
    },
  });
}

async function boot() {
  try { await openDb(); requestPersistence(); }
  catch (e) { toast('Storage unavailable: ' + (e?.message || e)); }
  const [settings, count] = await Promise.all([getSettings(), countIncidents()]);
  if (!settings.onboardedAt && count === 0) { await showOnboarding(); return; }
  await refreshBanner();
  await show('log');
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
boot();
