// captureFields.js — Evidence Trail capture: state + per-step field bodies.
// One concern: the field UI for each step. The stepper shell lives in captureForm.js.
import { el } from '../ui/dom.js';
import { ISSUE_GROUPS } from '../config/uiCopy.js';
import { icon } from '../ui/icons.js';
import { getCurrentPosition, formatLoc } from './geo.js';
import { fileToAttachment, attachmentUrl, humanSize } from './media.js';
import { todayDateStr, nowTimeStr } from '../domain/timeUtils.js';

export function buildInitialState(existing, settings) {
  const base = {
    types: [], incidentDate: todayDateStr(), workplace: (settings.workplaces || [])[0] || '',
    clockIn: '', clockOut: '',
    meal: { start: '', end: '', interrupted: false, interruptedBy: '', detail: '', onCall: false, relievedOfDuty: null, taken: null, waived: false, writtenAgreement: '' },
    meal2: { start: '', end: '', taken: null, waived: false },
    rest: { taken: null, interrupted: false, onCall: false },
    offClock: { start: '', end: '', task: '', directedBy: '', knownBy: '', payPeriod: '', expectedPay: '', employerEdited: null },
    notice: { to: '', channel: '', response: '', adverseAction: '' },
    witnesses: '', narrative: '', location: null, attachments: [],
  };
  if (!existing) return base;
  return {
    ...base, types: [...(existing.types || [])],
    incidentDate: existing.incidentDate || base.incidentDate, workplace: existing.workplace || base.workplace,
    clockIn: existing.clockIn || '', clockOut: existing.clockOut || '',
    meal: { ...base.meal, ...(existing.meal || {}) }, meal2: { ...base.meal2, ...(existing.meal2 || {}) },
    rest: { ...base.rest, ...(existing.rest || {}) }, offClock: { ...base.offClock, ...(existing.offClock || {}) },
    notice: { ...base.notice, ...(existing.notice || {}) },
    witnesses: existing.witnesses || '', narrative: existing.narrative || '',
    location: existing.location || null, attachments: [...(existing.attachments || [])],
  };
}

// ---- primitives -----------------------------------------------------------
const iconEl = (n) => { const s = el('span'); s.innerHTML = icon(n); return s.firstElementChild || s; };
const field = (label, input, hint) => el('label', { class: 'field' }, [
  el('span', { class: 'field-label', text: label }), input, hint ? el('span', { class: 'hint', text: hint }) : null,
]);
const textInput = (v, oninput, attrs = {}) => el('input', { type: 'text', value: v || '', oninput: e => oninput(e.target.value), ...attrs });
const subHead = (t) => el('div', { class: 'sub-head', text: t });
function timeRow(label, value, setter) {
  const input = el('input', { type: 'time', value: value || '', oninput: e => setter(e.target.value) });
  const now = el('button', { type: 'button', class: 'btn tiny', text: 'Now', onclick: () => { const t = nowTimeStr(); input.value = t; setter(t); } });
  return el('label', { class: 'field' }, [el('span', { class: 'field-label', text: label }), el('div', { class: 'time-row' }, [input, now])]);
}
const checkbox = (label, checked, onchange) => el('label', { class: 'check' }, [
  el('input', { type: 'checkbox', checked: !!checked, onchange: e => onchange(e.target.checked) }), el('span', { text: label }),
]);
function triSelect(value, onchange) {
  const sel = el('select', { onchange: e => { const v = e.target.value; onchange(v === '' ? null : v === 'yes'); } });
  [['', '—'], ['yes', 'Yes'], ['no', 'No']].forEach(([v, t]) =>
    sel.appendChild(el('option', { value: v, text: t, selected: (value === true && v === 'yes') || (value === false && v === 'no') })));
  return sel;
}

// ---- step bodies ----------------------------------------------------------
function issueChips(state) {
  const wrap = el('div', {});
  ISSUE_GROUPS.forEach(group => {
    const grid = el('div', { class: 'issue-grid' });
    group.items.forEach(item => {
      const on = state.types.includes(item.id);
      const btn = el('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', text: item.label });
      btn.addEventListener('click', () => {
        const i = state.types.indexOf(item.id);
        if (i >= 0) state.types.splice(i, 1); else state.types.push(item.id);
        const nowOn = state.types.includes(item.id);
        btn.classList.toggle('on', nowOn); btn.setAttribute('aria-pressed', nowOn ? 'true' : 'false');
      });
      grid.appendChild(btn);
    });
    wrap.appendChild(el('div', { class: 'issue-group' }, [el('div', { class: 'issue-group-label', text: group.label }), grid]));
  });
  return wrap;
}
export function issueBody(state) {
  const date = el('input', { type: 'date', value: state.incidentDate, oninput: e => state.incidentDate = e.target.value });
  const place = textInput(state.workplace, v => state.workplace = v, { list: 'workplaces', placeholder: 'Dealership / place' });
  return el('div', {}, [el('div', { class: 'grid2' }, [field('Date', date), field('Place', place)]), issueChips(state)]);
}
export function timeBody(state) {
  return el('div', {}, [
    el('div', { class: 'grid2' }, [
      timeRow('Started work', state.clockIn, v => state.clockIn = v),
      timeRow('Stopped work', state.clockOut, v => state.clockOut = v),
    ]),
    subHead('Rest breaks'),
    field('10-minute rest breaks you took', el('input', { type: 'number', min: '0', max: '6', value: state.rest.taken ?? '', oninput: e => state.rest.taken = e.target.value === '' ? null : Number(e.target.value) })),
    checkbox('A rest break was interrupted', state.rest.interrupted, c => state.rest.interrupted = c),
    checkbox('Kept on call / watching the queue during rest', state.rest.onCall, c => state.rest.onCall = c),
  ]);
}
export function mealBody(state) {
  // The written-agreement question only matters for an on-duty meal — show it only when the
  // entry already looks on-duty (worked through / on-call / not free to leave).
  const onDuty = () => state.meal.interrupted || state.meal.onCall || state.meal.relievedOfDuty === false;
  const agreeSel = el('select', { onchange: e => state.meal.writtenAgreement = e.target.value });
  [['', 'Not sure'], ['yes', 'Yes'], ['no', 'No']].forEach(([v, t]) =>
    agreeSel.appendChild(el('option', { value: v, text: t, selected: (state.meal.writtenAgreement || '') === v })));
  const agreeField = field('Was there a written, revocable on-duty meal agreement?', agreeSel,
    'California allows working through a meal only with a signed, revocable agreement.');
  const syncAgree = () => { agreeField.hidden = !onDuty(); };

  const body = el('div', {}, [
    el('div', { class: 'grid2' }, [
      timeRow('Lunch started', state.meal.start, v => state.meal.start = v),
      timeRow('Lunch ended', state.meal.end, v => state.meal.end = v),
    ]),
    checkbox('I did NOT get a lunch at all', state.meal.taken === false, c => state.meal.taken = c ? false : null),
    checkbox('Someone bothered me during lunch', state.meal.interrupted, c => { state.meal.interrupted = c; syncAgree(); }),
    field('Who bothered you (name / role)', textInput(state.meal.interruptedBy, v => state.meal.interruptedBy = v, { placeholder: 'e.g. manager name' })),
    checkbox('I had to stay reachable (radio / phone / on-call) during lunch', state.meal.onCall, c => { state.meal.onCall = c; syncAgree(); }),
    field('Were you free to leave?', triSelect(state.meal.relievedOfDuty, v => { state.meal.relievedOfDuty = v; syncAgree(); })),
    agreeField,
    checkbox('Did you skip lunch by choice?', state.meal.waived, c => state.meal.waived = c),
    subHead('Second lunch (shift over 10 hours)'),
    el('div', { class: 'grid2' }, [
      timeRow('2nd lunch started', state.meal2.start, v => state.meal2.start = v),
      timeRow('2nd lunch ended', state.meal2.end, v => state.meal2.end = v),
    ]),
  ]);
  syncAgree();
  return body;
}
export function offClockBody(state) {
  const o = state.offClock;
  return el('div', {}, [
    el('div', { class: 'grid2' }, [
      timeRow('Unpaid work started', o.start, v => o.start = v),
      timeRow('Unpaid work ended', o.end, v => o.end = v),
    ]),
    field('What did you do?', textInput(o.task, v => o.task = v, { placeholder: 'e.g. answered calls before clock-in' })),
    field('Who told you to (name / role)', textInput(o.directedBy, v => o.directedBy = v)),
    field('Did they change your time record?', triSelect(o.employerEdited, v => o.employerEdited = v)),
  ]);
}
export function proofBody(state) {
  const locStatus = el('span', { class: 'hint', text: state.location ? formatLoc(state.location) : 'Location not added' });
  const locBtn = el('button', { type: 'button', class: 'btn', onclick: async () => {
    locBtn.disabled = true; locStatus.textContent = 'Getting GPS…';
    const loc = await getCurrentPosition(); state.location = loc;
    locStatus.textContent = loc ? formatLoc(loc) : 'Location not added'; locBtn.disabled = false;
  } }, [iconEl('map-pin'), document.createTextNode(' Add location')]);
  const thumbs = el('div', { class: 'thumbs' });
  const renderThumbs = () => {
    thumbs.replaceChildren();
    state.attachments.forEach((a, idx) => {
      const rm = el('button', { type: 'button', class: 'thumb-x', text: '×', onclick: () => { state.attachments.splice(idx, 1); renderThumbs(); } });
      thumbs.appendChild(el('div', { class: 'thumb' }, [el('img', { src: attachmentUrl(a), alt: a.name }), rm, el('span', { class: 'thumb-meta', text: humanSize(a.size) })]));
    });
  };
  const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, capture: 'environment',
    onchange: async e => { for (const f of [...e.target.files]) state.attachments.push(await fileToAttachment(f)); e.target.value = ''; renderThumbs(); } });
  renderThumbs();
  return el('div', {}, [
    field('Where were you?', el('div', { class: 'loc-row' }, [locBtn, locStatus])),
    field('Photos of time clock, pay stub, or messages', fileInput, 'Your own records only. No secret audio — illegal in CA.'),
    thumbs,
    field('Who saw it?', textInput(state.witnesses, v => state.witnesses = v, { placeholder: 'Names of anyone who saw it' })),
  ]);
}
export function storyBody(state) {
  const narrative = el('textarea', { rows: '4', placeholder: 'Short facts. Names, times, and what was said help.', oninput: e => state.narrative = e.target.value });
  narrative.value = state.narrative || '';
  const channel = el('select', { onchange: e => state.notice.channel = e.target.value });
  ['', 'Said it', 'Text', 'Email', 'HR portal', 'Wrote it down'].forEach(o =>
    channel.appendChild(el('option', { value: o, text: o || 'How did you tell them?', selected: state.notice.channel === o })));
  return el('div', {}, [
    field('Tell what happened', narrative),
    subHead('Did you report it?'),
    field('Who you told (name / role)', textInput(state.notice.to, v => state.notice.to = v)),
    field('How', channel),
    field('What they said back', textInput(state.notice.response, v => state.notice.response = v)),
    field('Did anything happen after you spoke up?', textInput(state.notice.adverseAction, v => state.notice.adverseAction = v, { placeholder: 'e.g. write-up, schedule cut, an email blaming me' }), 'Adverse treatment after a complaint can be its own issue. Keep proof + the date.'),
  ]);
}
