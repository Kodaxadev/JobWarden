// captureForm.js — the Log screen. One concern: composing the adaptive capture on one screen
// (a slim live bar, "What happened?", the detail sections that question reveals, proof, save)
// and persisting it. The detail sections come from captureFields; only what was picked shows.
import { el, clear, toast } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { createIncident, reviseIncident, validateIncident } from '../domain/incidentModel.js';
import { addIncident, putIncident } from '../data/incidentRepo.js';
import { getSettings } from '../data/settingsRepo.js';
import { todayDateStr } from '../domain/timeUtils.js';
import { renderShiftPanel } from '../ui/shiftPanel.js';
import { openInterruptedLunch } from './quickCapture.js';
import { buildInitialState, whatHappenedSection, activeSections, proofSection } from './captureFields.js';

const iconEl = (n) => { const s = el('span'); s.innerHTML = icon(n); return s.firstElementChild || s; };
function dateLabel(ds) {
  const [y, m, d] = String(ds).split('-').map(Number);
  if (!y) return '—';
  const nice = new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return (ds === todayDateStr() ? 'Today, ' : '') + nice;
}

export async function renderCaptureForm(container, { onSaved, existing, template, prefill } = {}) {
  clear(container);
  const settings = await getSettings();

  // Slim "right now" bar (fresh log only): quick log + the shift tracker.
  if (!existing && !template && !prefill) {
    const liveBar = el('div', { class: 'live-bar' });
    const quickBtn = el('button', { type: 'button', class: 'btn live-quick', onclick: () => openInterruptedLunch({ onSaved }) },
      [iconEl('alert'), document.createTextNode(' Quick log')]);
    const shiftHost = el('div', { class: 'shift-host' });
    liveBar.append(quickBtn, shiftHost);
    container.appendChild(liveBar);
    await renderShiftPanel(shiftHost, { settings, onEndShift: (draft) => renderCaptureForm(container, { onSaved, prefill: draft }) });
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

  const form = el('form', { class: 'capture', autocomplete: 'off' });
  form.addEventListener('submit', e => e.preventDefault());
  const body = el('div', { class: 'capture-body' });
  const adaptiveHost = el('div', { class: 'adaptive' });
  const saveBtn = el('button', { type: 'button', class: 'btn save big', onclick: () => save() },
    [iconEl('save'), document.createTextNode(' ' + (existing ? 'Save changes' : 'Save record'))]);
  form.append(body, el('div', { class: 'savewrap' }, [saveBtn]));

  if ((settings.workplaces || []).length) {
    const dl = el('datalist', { id: 'workplaces' });
    settings.workplaces.forEach(w => dl.appendChild(el('option', { value: w })));
    form.appendChild(dl);
  }
  container.appendChild(form);

  const whatHappened = whatHappenedSection(state, { onChange: renderAdaptive });
  const proof = proofSection(state);
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
      finalPay: state.finalPay,
      witnesses: state.witnesses, narrative: state.narrative, attachments: state.attachments,
    };
    const draft = existing ? reviseIncident(existing, input) : createIncident(input);
    const { valid, errors } = validateIncident(draft);
    if (!valid) {
      toast(errors[0] === 'Pick at least one issue type.' ? 'Pick what happened first' : errors[0]);
      whatHappened.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    try {
      if (existing) await putIncident(draft); else await addIncident(draft);
      toast(existing ? 'Record updated' : 'Saved on this phone ✓');
      onSaved?.(draft);
    } catch (err) { toast('Could not save: ' + (err?.message || err)); }
  }
}
