// captureForm.js — the Log screen. One concern: composing the adaptive capture on one screen
// (a slim live bar, "What happened?", the detail sections that question reveals, proof, save)
// and persisting it. The detail sections come from captureFields; only what was picked shows.
import { el, clear, toast } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { confirmDialog } from '../ui/confirmDialog.js';
import { createIncident, reviseIncident, validateIncident, sanityWarnings } from '../domain/incidentModel.js';
import { addIncident, putIncident } from '../data/incidentRepo.js';
import { getSettings } from '../data/settingsRepo.js';
import { todayDateStr } from '../domain/timeUtils.js';
import { renderShiftPanel } from '../ui/shiftPanel.js';
import { reportSaveFailure } from '../ui/saveFailure.js';
import { openInterruptedLunch } from './quickCapture.js';
import { buildInitialState, whatHappenedSection, activeSections } from './captureFields.js';
import { proofSection } from './evidenceFields.js';
import { backButton } from '../ui/actionRow.js';
import { createNavigationGuard } from '../ui/navigationGuard.js';

const iconEl = (n) => { const s = el('span'); s.innerHTML = icon(n); return s.firstElementChild || s; };
function dateLabel(ds) {
  const [y, m, d] = String(ds).split('-').map(Number);
  if (!y) return '—';
  const nice = new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return (ds === todayDateStr() ? 'Today, ' : '') + nice;
}

export async function renderCaptureForm(container, {
  onSaved, onQuickSaved, onCancel, setNavigationGuard, existing, template, prefill,
} = {}) {
  clear(container);
  const settings = await getSettings();

  // Slim "right now" bar (fresh log only): interrupted-lunch capture + shift tracker.
  if (!existing && !template && !prefill) {
    const liveBar = el('div', { class: 'live-bar' });
    const quickBtn = el('button', {
      type: 'button', class: 'btn live-quick',
      onclick: () => openInterruptedLunch({ onSaved: onQuickSaved }),
    },
      [iconEl('circle-alert'), document.createTextNode(' Interrupted lunch')]);
    const shiftHost = el('div', { class: 'shift-host' });
    liveBar.append(quickBtn, shiftHost);
    container.appendChild(liveBar);
    await renderShiftPanel(shiftHost, {
      settings,
      onEndShift: (draft) => renderCaptureForm(container, {
        onSaved, onQuickSaved, onCancel, setNavigationGuard, prefill: draft,
      }),
    });
  }

  const state = buildInitialState(existing || template || prefill, settings);
  // "Log again": keep the recurring facts but make it a fresh, contemporaneous record.
  if (template && !existing) {
    state.incidentDate = todayDateStr();
    state.narrative = ''; state.attachments = []; state.location = null; state.witnesses = '';
    state.notice = { to: '', channel: '', response: '', adverseAction: '' };
    toast('Filled in from ' + dateLabel(template.incidentDate) + ' — confirm today’s times');
  }
  if (prefill && !existing) toast('Filled in from your shift — review and save');

  if (existing || template) {
    container.appendChild(el('section', { class: 'capture-mode' }, [
      backButton(onCancel),
      el('div', { class: 'capture-mode-copy' }, [
        el('span', { class: 'capture-mode-kicker', text: existing ? 'Editing saved record' : 'New record from prior entry' }),
        el('strong', { text: dateLabel((existing || template).incidentDate) }),
      ]),
      el('span', { class: 'capture-mode-icon', 'aria-hidden': 'true' }, [iconEl(existing ? 'clipboard-pen' : 'rotate-ccw')]),
    ]));
  }

  const form = el('form', { class: 'capture', autocomplete: 'off' });
  form.addEventListener('submit', e => e.preventDefault());
  const guard = createNavigationGuard(() => confirmDialog(
    'Changes to this record will be lost.',
    {
      title: 'Leave without saving?',
      confirmText: 'Leave',
      cancelText: 'Keep editing',
      iconName: 'triangle-alert',
    },
  ));
  const markDirty = () => guard.markDirty();
  form.addEventListener('input', markDirty);
  form.addEventListener('change', markDirty);
  setNavigationGuard?.(() => guard.canLeave());
  const body = el('div', { class: 'capture-body' });
  const adaptiveHost = el('div', { class: 'adaptive' });
  const validationText = el('span');
  const validationMessage = el('div', {
    class: 'form-message',
    role: 'alert',
    tabindex: '-1',
    hidden: true,
  }, [iconEl('circle-alert'), validationText]);
  const clearValidation = () => {
    validationMessage.hidden = true;
    validationText.textContent = '';
  };
  form.addEventListener('input', clearValidation);
  form.addEventListener('change', clearValidation);
  const showValidation = (message) => {
    validationText.textContent = message;
    validationMessage.hidden = false;
    validationMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    validationMessage.focus({ preventScroll: true });
  };
  const saveBtn = el('button', { type: 'button', class: 'btn save big', onclick: () => save() },
    [iconEl('save'), document.createTextNode(' ' + (existing ? 'Save changes' : 'Save record'))]);
  form.append(body, el('div', { class: 'savewrap' }, [saveBtn]));

  if ((settings.workplaces || []).length) {
    const dl = el('datalist', { id: 'workplaces' });
    settings.workplaces.forEach(w => dl.appendChild(el('option', { value: w })));
    form.appendChild(dl);
  }
  container.appendChild(form);

  const whatHappened = whatHappenedSection(state, {
    onChange: () => { markDirty(); clearValidation(); renderAdaptive(); },
  });
  const proof = proofSection(state, { onChange: markDirty });
  whatHappened.insertBefore(validationMessage, whatHappened.querySelector('.issue-picker'));
  body.append(whatHappened, adaptiveHost, proof);
  renderAdaptive();

  // Only the detail sections the picked issues need; re-rendered when the picks change.
  function renderAdaptive() {
    clear(adaptiveHost);
    activeSections(state).forEach(sec => adaptiveHost.appendChild(sec));
  }

  async function save() {
    const input = {
      incidentDate: state.incidentDate, workplace: state.workplace, location: state.location,
      clockIn: state.clockIn, clockOut: state.clockOut, types: state.types,
      jurisdiction: settings.jurisdiction,
      classification: { payType: settings.payType, awsElection: settings.awsElection, cbaCovered: settings.cbaCovered },
      meal: state.meal, meal2: state.meal2, rest: state.rest, offClock: state.offClock, notice: state.notice,
      finalPay: state.finalPay, schedule: state.schedule, expense: state.expense,
      splitShift: state.splitShift, payStub: state.payStub, tips: state.tips, sickLeave: state.sickLeave,
      witnesses: state.witnesses, narrative: state.narrative, attachments: state.attachments,
    };
    const draft = existing ? reviseIncident(existing, input) : createIncident(input);
    const { valid, errors } = validateIncident(draft);
    if (!valid) {
      showValidation(errors[0] === 'Pick at least one issue type.'
        ? 'Choose at least one issue before saving this record.'
        : errors[0]);
      return;
    }
    clearValidation();
    // Likely-typo check — never blocks; just offers a chance to fix a fat-fingered time.
    const warnings = sanityWarnings(draft);
    if (warnings.length && !await confirmDialog(warnings[0], {
      title: 'Check this entry',
      confirmText: 'Save anyway',
      cancelText: 'Fix it',
      iconName: 'clock-alert',
    })) {
      return;
    }
    const write = (rec) => (existing ? putIncident(rec) : addIncident(rec));
    try {
      await write(draft);
      guard.reset();
      setNavigationGuard?.(null);
      toast(existing ? 'Record updated' : 'Record saved on this phone', { tone: 'success' });
      onSaved?.(draft);
    } catch (err) {
      // A record that will not save is evidence about to be lost, so this blocks rather
      // than toasts, and offers the trade that keeps the facts (see saveFailure.js).
      const r = await reportSaveFailure(err, draft, write);
      if (r.saved) {
        guard.reset();
        setNavigationGuard?.(null);
        onSaved?.(draft);
      }
    }
  }
}
