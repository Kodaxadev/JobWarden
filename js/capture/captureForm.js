// captureForm.js — Evidence Trail stepper: collapsed step rows, accordion expand, save.
// One concern: assembling the trail shell, status, and save → validate → persist.
import { el, clear, toast } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { TRAIL_STEPS } from '../config/uiCopy.js';
import { createIncident, reviseIncident, validateIncident } from '../domain/incidentModel.js';
import { addIncident, putIncident } from '../data/incidentRepo.js';
import { getSettings } from '../data/settingsRepo.js';
import { todayDateStr } from '../domain/timeUtils.js';
import { renderShiftPanel } from '../ui/shiftPanel.js';
import { openInterruptedLunch } from './quickCapture.js';
import { buildInitialState, issueBody, timeBody, mealBody, offClockBody, proofBody, storyBody } from './captureFields.js';

const BODY = { issue: issueBody, time: timeBody, meal: mealBody, offClock: offClockBody, proof: proofBody, story: storyBody };
const iconEl = (n) => { const s = el('span'); s.innerHTML = icon(n); return s.firstElementChild || s; };

function isSet(id, s) {
  switch (id) {
    case 'issue': return s.types.length > 0;
    case 'time': return !!(s.clockIn || s.clockOut || s.rest.taken != null || s.rest.interrupted || s.rest.onCall);
    case 'meal': return !!(s.meal.start || s.meal.taken === false || s.meal.waived || s.meal2.start);
    case 'offClock': return !!(s.offClock.start || s.offClock.task);
    case 'proof': return !!((s.attachments || []).length || s.location || s.witnesses);
    case 'story': return !!((s.narrative || '').trim() || s.notice.to || s.finalPay?.separation || s.finalPay?.lastDay);
    default: return false;
  }
}
function dateLabel(ds) {
  const [y, m, d] = String(ds).split('-').map(Number);
  if (!y) return '—';
  const nice = new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  return (ds === todayDateStr() ? 'Today, ' : '') + nice;
}

export async function renderCaptureForm(container, { onSaved, existing, template, prefill } = {}) {
  clear(container);
  const settings = await getSettings();

  // Live shift tracker sits atop a fresh Log (not when editing, duplicating, or prefilling).
  if (!existing && !template && !prefill) {
    // Moment-of-incident quick capture — one tap, sealed at the interruption.
    container.appendChild(el('button', { type: 'button', class: 'btn quick-interrupt', onclick: () => openInterruptedLunch({ onSaved }) },
      [iconEl('alert'), document.createTextNode(' Interrupted lunch — log it now')]));
    const panelHost = el('div', { class: 'shift-host' });
    container.appendChild(panelHost);
    await renderShiftPanel(panelHost, { settings, onEndShift: (draft) => renderCaptureForm(container, { onSaved, prefill: draft }) });
  }

  const state = buildInitialState(existing || template || prefill, settings);
  // "Log again": pre-fill the recurring facts but keep it a fresh, contemporaneous record —
  // new date, and clear the per-day evidence (narrative, photos, location, who-told).
  if (template && !existing) {
    state.incidentDate = todayDateStr();
    state.narrative = ''; state.attachments = []; state.location = null; state.witnesses = '';
    state.notice = { to: '', channel: '', response: '', adverseAction: '' };
    toast('Filled in from ' + dateLabel(template.incidentDate) + ' — confirm today’s times');
  }
  if (prefill && !existing) toast('Filled in from your shift — review and save');
  let openId = null;

  const form = el('form', { class: 'capture', autocomplete: 'off' });
  form.addEventListener('submit', e => e.preventDefault());

  const status = el('div', { class: 'log-status' });
  const steps = el('div', { class: 'steps' });
  const saveBtn = el('button', { type: 'button', class: 'btn save big', onclick: () => save() }, [iconEl('save'), document.createTextNode(' ' + (existing ? 'Save changes' : 'Save Record'))]);
  form.append(status, steps, el('div', { class: 'savewrap' }, [saveBtn]));

  if ((settings.workplaces || []).length) {
    const dl = el('datalist', { id: 'workplaces' });
    settings.workplaces.forEach(w => dl.appendChild(el('option', { value: w })));
    form.appendChild(dl);
  }
  container.appendChild(form);
  render();

  function render() {
    status.replaceChildren(
      el('span', {}, [iconEl('calendar'), document.createTextNode(' ' + dateLabel(state.incidentDate))]),
      el('i', {}),
      el('span', {}, [iconEl('shield'), document.createTextNode(' Only you can see this')]),
    );
    clear(steps);
    const activeId = (TRAIL_STEPS.find(st => !isSet(st.id, state)) || {}).id || null;
    TRAIL_STEPS.forEach((step, idx) => {
      const set = isSet(step.id, state);
      const active = step.id === activeId;
      const open = openId === step.id;
      steps.appendChild(stepEl(step, idx, { set, active, open }));
    });
  }

  function stepEl(step, idx, { set, active, open }) {
    const bodyId = 'stepbody-' + step.id;
    const toggle = () => { openId = open ? null : step.id; render(); };
    const stepBtn = el('button', {
      type: 'button', class: 'stepbtn' + (active ? ' on' : ''),
      'aria-expanded': open ? 'true' : 'false', 'aria-controls': bodyId,
      onclick: e => { e.stopPropagation(); toggle(); },
    }, [document.createTextNode(step.btn + ' '), iconEl('chevron-right')]);
    const stat = set
      ? el('div', { class: 'stat set' }, [iconEl('check'), document.createTextNode(' Added')])
      : el('div', { class: 'stat' + (active ? ' on' : '') }, [el('span', { class: 'dot' }), document.createTextNode(' Not set')]);
    const node = el('div', { class: 'node' }, [set ? iconEl('check') : document.createTextNode(String(idx + 1))]);
    const row = el('div', { class: 'step-row', onclick: toggle }, [
      el('div', { class: 'rail' }, [node]),
      el('div', { class: 'txt' }, [el('div', { class: 'title', text: step.title }), el('div', { class: 'help', text: step.helper })]),
      el('div', { class: 'act' }, [stepBtn, stat]),
    ]);
    const art = el('article', { class: 'step' + (active ? ' active' : '') + (set ? ' set' : '') + (open ? ' open' : '') }, [row]);
    if (open) art.appendChild(el('div', { class: 'step-body', id: bodyId }, [BODY[step.id](state)]));
    return art;
  }

  async function save() {
    const input = {
      incidentDate: state.incidentDate, workplace: state.workplace, location: state.location,
      clockIn: state.clockIn, clockOut: state.clockOut, types: state.types,
      classification: { payType: settings.payType, awsElection: settings.awsElection, cbaCovered: settings.cbaCovered },
      meal: state.meal, meal2: state.meal2, rest: state.rest, offClock: state.offClock, notice: state.notice,
      finalPay: state.finalPay,
      witnesses: state.witnesses, narrative: state.narrative, attachments: state.attachments,
    };
    const draft = existing ? reviseIncident(existing, input) : createIncident(input);
    const { valid, errors } = validateIncident(draft);
    if (!valid) { openId = 'issue'; render(); toast(errors[0] === 'Pick at least one issue type.' ? 'Pick what happened first' : errors[0]); return; }
    try {
      if (existing) await putIncident(draft); else await addIncident(draft);
      toast(existing ? 'Record updated' : 'Saved on this phone ✓');
      onSaved?.(draft);
    } catch (err) { toast('Could not save: ' + (err?.message || err)); }
  }
}
