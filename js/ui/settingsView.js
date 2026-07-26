// settingsView.js — profile, workplaces, data safety. One concern: settings UI.
import { el, clear, toast, withBusy } from './dom.js';
import { confirmDialog } from './confirmDialog.js';
import { getSettings, saveSettings } from '../data/settingsRepo.js';
import { requestPersistence } from '../data/db.js';
import { jurisdictionLabel } from '../config/jurisdictions.js';
import { swVersion } from '../version.js';
import { readErrors, clearErrors, errorLogText } from '../data/errorLog.js';
import { setTheme } from './theme.js';
import { PAY_STATUS_OPTIONS, PAY_STATUS_HINT, EXEMPT_STATUS_WARNING } from '../config/payStatus.js';
import { actionRow } from './actionRow.js';
import { statusRow, updateStatusRow } from './statusUi.js';
import { createNavigationGuard } from './navigationGuard.js';
import { eraseDataAction } from './eraseData.js';

// Bytes → a short human string that also handles GB (humanSize in media.js stops at MB).
function fmtBytes(n) {
  if (!n || n < 0) return '0 MB';
  const mb = n / 1048576;
  if (mb < 1) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

const field = (label, input, hint) => el('label', { class: 'field' }, [
  el('span', { class: 'field-label', text: label }), input,
  hint ? el('span', { class: 'hint', text: hint }) : null,
]);
const text = (v, ph) => el('input', { type: 'text', value: v || '', placeholder: ph || '' });

export async function renderSettingsView(container, {
  onShowRights,
  onShowLegal,
  setNavigationGuard,
} = {}) {
  clear(container);
  const s = await getSettings();
  const guard = createNavigationGuard(() => confirmDialog(
    'Changes to your profile, schedule, or workplaces will be lost. Theme changes are already saved.',
    {
      title: 'Leave settings without saving?',
      confirmText: 'Leave',
      cancelText: 'Keep editing',
      iconName: 'settings',
    },
  ));
  setNavigationGuard?.(() => guard.canLeave());

  const name = text(s.employeeName, 'Your name');
  const role = text(s.role, 'e.g. cashier, server, caregiver');
  const employer = text(s.employer, 'Employer');
  const pay = el('select', {});
  PAY_STATUS_OPTIONS.forEach(([v, t]) =>
    pay.appendChild(el('option', { value: v, text: t, selected: s.payType === v })));
  const payWarn = el('p', { class: 'hint warn-text', hidden: s.payType !== 'salary_exempt',
    text: EXEMPT_STATUS_WARNING });
  pay.addEventListener('change', () => { payWarn.hidden = pay.value !== 'salary_exempt'; });

  const sched = (val) => {
    const sel = el('select', {});
    [['', 'Not sure / N/A'], ['yes', 'Yes'], ['no', 'No']].forEach(([v, t]) => sel.appendChild(el('option', { value: v, text: t, selected: val === v })));
    return sel;
  };
  const aws = sched(s.awsElection);
  const cba = sched(s.cbaCovered);

  const places = el('textarea', { rows: '3', placeholder: 'One place per line' });
  places.value = (s.workplaces || []).join('\n');

  const save = el('button', { class: 'btn primary settings-save', text: 'Save settings', onclick: async () => {
    await withBusy(save, 'Saving…', async () => {
      await saveSettings({
        employeeName: name.value.trim(), role: role.value.trim(), employer: employer.value.trim(),
        payType: pay.value, awsElection: aws.value, cbaCovered: cba.value,
        workplaces: places.value.split('\n').map(x => x.trim()).filter(Boolean),
      });
    });
    guard.reset();
    toast('Settings saved on this phone', { tone: 'success' });
  } });
  [name, role, employer, pay, aws, cba, places].forEach(control => {
    control.addEventListener('input', () => guard.markDirty());
    control.addEventListener('change', () => guard.markDirty());
  });
  const persistBtn = actionRow({
    label: 'Protect records on this device',
    description: 'Ask the browser not to clear JobWarden automatically.',
    iconName: 'shield-check',
    variant: 'secure',
    onClick: async () => {
      const ok = await requestPersistence();
      updateStatusRow(persistStatus, ok
        ? {
          label: 'Auto-delete protection',
          detail: 'Enabled for this browser.',
          iconName: 'shield-check',
          tone: 'success',
        }
        : {
          label: 'Auto-delete protection',
          detail: 'Not enabled. Back up often.',
          iconName: 'shield-alert',
          tone: 'warning',
        });
      toast(
        ok ? 'Auto-delete protection enabled' : 'Protection was not enabled — back up often',
        { tone: ok ? 'success' : 'warning' },
      );
    },
  });

  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'About you' }),
    field('Name', name), field('Role', role), field('Employer', employer),
    field('Pay and exemption status', pay, PAY_STATUS_HINT), payWarn,
  ]));

  const theme = el('select', {}, [['dark', 'Dark'], ['light', 'Light'], ['system', 'Match my phone']]
    .map(([v, t]) => el('option', { value: v, text: t, selected: (s.theme || 'dark') === v })));
  theme.addEventListener('change', () => setTheme(theme.value));
  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Appearance' }),
    field('Theme', theme, 'Light is easier to read in bright sun. Theme changes save immediately.'),
  ]));
  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Schedule & coverage' }),
    el('p', { class: 'hint', text: 'Optional — helps the app avoid flagging rules that may not apply to you.' }),
    field('Alternative workweek (e.g. four 10-hour days)?', aws, 'If validly adopted by a vote, daily overtime after 8 hours may not apply.'),
    field('Covered by a union contract (CBA)?', cba, 'Some California rules have specific union-agreement exceptions; the agreement and rule must be checked.'),
  ]));
  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Workplaces' }),
    field('Your workplaces', places, 'These fill in the place box when you log.'),
  ]));
  container.appendChild(el('div', { class: 'settings-save-wrap' }, [
    save,
    el('p', { class: 'settings-save-note', text: 'Saves your profile, schedule, and workplaces on this phone.' }),
  ]));
  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Know your rights' }),
    el('p', { class: 'hint', text: 'Plain-language California wage-and-hour basics — general information, not legal advice.' }),
    el('p', { class: 'hint', text: `Rules region: ${jurisdictionLabel(s.jurisdiction)} — more states are coming.` }),
    el('div', { class: 'action-list compact' }, [
      actionRow({
        label: 'Open the rights guide',
        description: 'Read the California guide offline.',
        iconName: 'shield',
        onClick: () => onShowRights?.(),
      }),
    ]),
  ]));
  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Legal & privacy' }),
    el('p', { class: 'hint', text: 'What JobWarden is and isn’t, and how your data is kept. Not legal advice.' }),
    el('div', { class: 'action-list compact' }, [
      actionRow({
        label: 'Legal, privacy & terms',
        description: 'See what the app can and cannot do.',
        iconName: 'lock',
        onClick: () => onShowLegal?.(),
      }),
    ]),
  ]));
  // Storage + build facts, filled in after the async probes resolve.
  const storageStatus = statusRow({
    label: 'Device storage',
    detail: 'Checking browser storage…',
    iconName: 'save',
    tone: 'loading',
  });
  const persistStatus = statusRow({
    label: 'Auto-delete protection',
    detail: 'Checking protection…',
    iconName: 'shield',
    tone: 'loading',
  });
  const versionStatus = statusRow({
    label: 'Installed build',
    detail: 'Checking version…',
    iconName: 'settings',
    tone: 'loading',
  });
  Promise.all([
    navigator.storage?.estimate?.() ?? Promise.resolve(null),
    navigator.storage?.persisted?.() ?? Promise.resolve(false),
    swVersion(),
  ]).then(([est, persisted, version]) => {
    updateStatusRow(storageStatus, est && est.quota
      ? {
        label: 'Device storage',
        detail: `${fmtBytes(est.usage || 0)} used · browser allows up to ${fmtBytes(est.quota)}`,
        iconName: 'save',
      }
      : {
        label: 'Device storage',
        detail: 'This browser does not provide a storage estimate.',
        iconName: 'save',
      });
    updateStatusRow(persistStatus, persisted
      ? {
        label: 'Auto-delete protection',
        detail: 'Enabled for this browser.',
        iconName: 'shield-check',
        tone: 'success',
      }
      : {
        label: 'Auto-delete protection',
        detail: 'Not enabled. Back up often.',
        iconName: 'shield-alert',
        tone: 'warning',
      });
    updateStatusRow(versionStatus, {
      label: 'Installed build',
      detail: version || 'Version unavailable in this browser.',
      iconName: 'settings',
    });
  }).catch(() => {
    updateStatusRow(storageStatus, {
      label: 'Device storage',
      detail: 'Storage details could not be checked.',
      iconName: 'circle-alert',
      tone: 'warning',
    });
    updateStatusRow(persistStatus, {
      label: 'Auto-delete protection',
      detail: 'Protection could not be checked. Back up often.',
      iconName: 'shield-alert',
      tone: 'warning',
    });
    updateStatusRow(versionStatus, {
      label: 'Installed build',
      detail: 'Version could not be checked.',
      iconName: 'settings',
    });
  });

  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Data safety' }),
    el('p', { class: 'hint', text: 'Records stay on this device. Browser protection can reduce automatic cleanup, but it is not a backup.' }),
    el('div', { class: 'status-list' }, [storageStatus, persistStatus, versionStatus]),
    el('p', { class: 'hint', text: 'Not legal advice. JobWarden does not record audio; California generally requires every party’s consent to record a confidential conversation.' }),
    el('div', { class: 'action-list compact' }, [persistBtn]),
  ]));

  // Diagnostics — local error log, copyable for support. Zero privacy cost; nothing is sent.
  const errs = readErrors();
  const healthStatus = errs.length
    ? statusRow({
      label: `${errs.length} recent app error${errs.length === 1 ? '' : 's'}`,
      detail: 'Stored only on this device. Copy them when asking for support.',
      iconName: 'circle-alert',
      tone: 'warning',
    })
    : statusRow({
      label: 'No recent app errors',
      detail: 'Local diagnostics have not recorded a failure.',
      iconName: 'circle-check',
      tone: 'success',
    });
  const diagnosticActions = errs.length ? el('div', { class: 'action-list compact' }, [
      actionRow({
        label: 'Copy error log',
        description: 'Copy local diagnostics to share with support.',
        iconName: 'clipboard-pen',
        onClick: async () => {
          try { await navigator.clipboard.writeText(errorLogText()); toast('Error log copied', { tone: 'success' }); }
          catch { toast('Copy is not available in this browser', { tone: 'error' }); }
        },
      }),
      actionRow({
        label: 'Clear error log',
        description: 'Remove the diagnostics stored on this device.',
        iconName: 'trash-2',
        onClick: () => {
          clearErrors();
          toast('Error log cleared', { tone: 'success' });
          updateStatusRow(healthStatus, {
            label: 'No recent app errors',
            detail: 'Local diagnostics have not recorded a failure.',
            iconName: 'circle-check',
            tone: 'success',
          });
          diagnosticActions?.remove();
        },
      }),
    ]) : null;
  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'App health' }),
    el('div', { class: 'status-list' }, [healthStatus]),
    diagnosticActions,
  ]));

  // Last, and on its own: deleting a record moves it to Deleted, where it can be restored. This
  // is the only control that actually destroys anything, and the promise that these records
  // belong to the person who logged them is not complete without it.
  container.appendChild(el('section', { class: 'card' }, [
    el('h2', { text: 'Erase this phone' }),
    el('p', { class: 'hint', text: 'Deleting a record moves it to Deleted, where you can restore it. This removes everything for good. Save a backup first if you might want these records later.' }),
    el('div', { class: 'action-list compact' }, [
      eraseDataAction({
        onErased: () => {
          // Nothing on screen is true any more — profile, records and first-run state are gone.
          // A reload is the honest redraw, and it works offline from the cached shell.
          guard.reset();
          location.reload();
        },
      }),
    ]),
  ]));
}
