// captureFields.js — Evidence Trail capture: state, trail steps, issue groups, field bodies.
// One concern: the Log capture UI. Primary labels are plain language (see uiCopy.js).
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
    meal: { start: '', end: '', interrupted: false, interruptedBy: '', detail: '', relievedOfDuty: null, taken: null, waived: false },
    meal2: { start: '', end: '', taken: null, waived: false },
    rest: { taken: null, interrupted: false, onCall: false },
    offClock: { start: '', end: '', task: '', directedBy: '', knownBy: '', payPeriod: '', expectedPay: '', employerEdited: null },
    notice: { to: '', channel: '', response: '' },
    witnesses: '', narrative: '', location: null, attachments: [],
  };
  if (!existing) return base;
  return {
    ...base,
    types: [...(existing.types || [])],
    incidentDate: existing.incidentDate || base.incidentDate,
    workplace: existing.workplace || base.workplace,
    clockIn: existing.clockIn || '', clockOut: existing.clockOut || '',
    meal: { ...base.meal, ...(existing.meal || {}) },
    meal2: { ...base.meal2, ...(existing.meal2 || {}) },
    rest: { ...base.rest, ...(existing.rest || {}) },
    offClock: { ...base.offClock, ...(existing.offClock || {}) },
    notice: { ...base.notice, ...(existing.notice || {}) },
    witnesses: existing.witnesses || '', narrative: existing.narrative || '',
    location: existing.location || null,
    attachments: [...(existing.attachments || [])],
  };
}

// ---- primitives -----------------------------------------------------------
function iconEl(name, label = '') { const s = el('span'); s.innerHTML = icon(name, label); return s.firstElementChild || s; }
function field(label, input, hint) {
  return el('label', { class: 'field' }, [
    el('span', { class: 'field-label', text: label }), input,
    hint ? el('span', { class: 'hint', text: hint }) : null,
  ]);
}
function textInput(value, oninput, attrs = {}) {
  return el('input', { type: 'text', value: value || '', oninput: e => oninput(e.target.value), ...attrs });
}
function timeRow(label, value, setter) {
  const input = el('input', { type: 'time', value: value || '', oninput: e => setter(e.target.value) });
  const now = el('button', { type: 'button', class: 'btn tiny', text: 'Now',
    onclick: () => { const t = nowTimeStr(); input.value = t; setter(t); } });
  return el('label', { class: 'field' }, [el('span', { class: 'field-label', text: label }), el('div', { class: 'time-row' }, [input, now])]);
}
function checkbox(label, checked, onchange) {
  return el('label', { class: 'check' }, [
    el('input', { type: 'checkbox', checked: !!checked, onchange: e => onchange(e.target.checked) }),
    el('span', { text: label }),
  ]);
}
function triSelect(value, onchange) {
  const sel = el('select', { onchange: e => { const v = e.target.value; onchange(v === '' ? null : v === 'yes'); } });
  [['', '—'], ['yes', 'Yes'], ['no', 'No']].forEach(([v, t]) =>
    sel.appendChild(el('option', { value: v, text: t, selected: (value === true && v === 'yes') || (value === false && v === 'no') })));
  return sel;
}
function badge(ic, text, cls = '') {
  return el('span', { class: ('status-badge ' + cls).trim() }, [iconEl(ic), document.createTextNode(' ' + text)]);
}

// ---- trail + issue picker -------------------------------------------------
export function logStatusRow() {
  return el('div', { class: 'status-row' }, [badge('shield-check', 'Saved on this phone', 'ok')]);
}
export function trailStep(def, body, complete) {
  return el('div', { class: 'trail-step' + (complete ? ' complete' : '') }, [
    el('div', { class: 'trail-dot' }, [iconEl(complete ? 'check' : def.icon)]),
    el('div', { class: 'trail-content' }, [
      el('div', { class: 'trail-title', text: def.title }),
      el('div', { class: 'trail-helper', text: def.helper }),
      el('div', { class: 'trail-body' }, body),
    ]),
  ]);
}
function issueBtn(item, state, onToggle) {
  const on = state.types.includes(item.id);
  const btn = el('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', text: item.label });
  btn.addEventListener('click', () => {
    const i = state.types.indexOf(item.id);
    if (i >= 0) state.types.splice(i, 1); else state.types.push(item.id);
    onToggle();
  });
  return btn;
}
export function issueGroups(state, onToggle) {
  const wrap = el('div', {});
  ISSUE_GROUPS.forEach(group => {
    const grid = el('div', { class: 'issue-grid' });
    group.items.forEach(item => grid.appendChild(issueBtn(item, state, onToggle)));
    wrap.appendChild(el('div', { class: 'issue-group' }, [el('div', { class: 'issue-group-label', text: group.label }), grid]));
  });
  return wrap;
}

// ---- step bodies ----------------------------------------------------------
export function basicsBody(state) {
  const date = el('input', { type: 'date', value: state.incidentDate, oninput: e => state.incidentDate = e.target.value });
  const place = textInput(state.workplace, v => state.workplace = v, { list: 'workplaces', placeholder: 'Dealership / place' });
  return el('div', { class: 'grid2' }, [field('Date', date), field('Place', place)]);
}

export function clockBody(state) {
  return el('div', { class: 'grid2' }, [
    timeRow('Started work', state.clockIn, v => state.clockIn = v),
    timeRow('Stopped work', state.clockOut, v => state.clockOut = v),
  ]);
}
export function mealBody(state, needsMeal2) {
  const kids = [
    el('div', { class: 'grid2' }, [
      timeRow('Lunch started', state.meal.start, v => state.meal.start = v),
      timeRow('Lunch ended', state.meal.end, v => state.meal.end = v),
    ]),
    checkbox('I did NOT get a lunch at all', state.meal.taken === false, c => state.meal.taken = c ? false : null),
    checkbox('Someone bothered me during lunch', state.meal.interrupted, c => state.meal.interrupted = c),
    field('Who bothered you (name / role)', textInput(state.meal.interruptedBy, v => state.meal.interruptedBy = v, { placeholder: 'e.g. manager name' })),
    field('What happened', textInput(state.meal.detail, v => state.meal.detail = v, { placeholder: 'e.g. pulled back to the phones' })),
    field('Were you free to leave?', triSelect(state.meal.relievedOfDuty, v => state.meal.relievedOfDuty = v)),
    checkbox('Did you skip lunch by choice?', state.meal.waived, c => state.meal.waived = c),
  ];
  if (needsMeal2) {
    kids.push(el('div', { class: 'sub-head', text: 'Second lunch (shift over 10 hours)' }));
    kids.push(el('div', { class: 'grid2' }, [
      timeRow('2nd lunch started', state.meal2.start, v => state.meal2.start = v),
      timeRow('2nd lunch ended', state.meal2.end, v => state.meal2.end = v),
    ]));
    kids.push(checkbox('Skipped 2nd lunch by choice', state.meal2.waived, c => state.meal2.waived = c));
  }
  return el('div', {}, kids);
}
export function restBody(state) {
  const taken = el('input', { type: 'number', min: '0', max: '6', value: state.rest.taken ?? '', oninput: e => state.rest.taken = e.target.value === '' ? null : Number(e.target.value) });
  return el('div', {}, [
    field('10-minute rest breaks you actually took', taken),
    checkbox('A rest break was interrupted', state.rest.interrupted, c => state.rest.interrupted = c),
    checkbox('Kept on call / watching the queue during rest', state.rest.onCall, c => state.rest.onCall = c),
  ]);
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
    field('Who else knew', textInput(o.knownBy, v => o.knownBy = v)),
    field('Pay period', textInput(o.payPeriod, v => o.payPeriod = v, { placeholder: 'e.g. Jun 1–15' })),
    field('Did they change your time record?', triSelect(o.employerEdited, v => o.employerEdited = v)),
  ]);
}
export function noticeBody(state) {
  const channel = el('select', { onchange: e => state.notice.channel = e.target.value });
  ['', 'Said it', 'Text', 'Email', 'HR portal', 'Wrote it down'].forEach(o =>
    channel.appendChild(el('option', { value: o, text: o || 'How did you tell them?', selected: state.notice.channel === o })));
  return el('div', {}, [
    field('Who you told (name / role)', textInput(state.notice.to, v => state.notice.to = v)),
    field('How', channel),
    field('What they said back', textInput(state.notice.response, v => state.notice.response = v)),
  ]);
}
export function proofBody(state) {
  const locStatus = el('span', { class: 'hint', text: state.location ? formatLoc(state.location) : 'Location not added' });
  const locBtn = el('button', { type: 'button', class: 'btn', onclick: async () => {
    locBtn.disabled = true; locStatus.textContent = 'Getting GPS…';
    const loc = await getCurrentPosition();
    state.location = loc; locStatus.textContent = loc ? formatLoc(loc) : 'Location not added';
    locBtn.disabled = false;
  } }, [iconEl('map-pin'), document.createTextNode(' Add location')]);

  const thumbs = el('div', { class: 'thumbs' });
  const renderThumbs = () => {
    thumbs.replaceChildren();
    state.attachments.forEach((a, idx) => {
      const img = el('img', { src: attachmentUrl(a), alt: a.name });
      const rm = el('button', { type: 'button', class: 'thumb-x', text: '×', onclick: () => { state.attachments.splice(idx, 1); renderThumbs(); } });
      thumbs.appendChild(el('div', { class: 'thumb' }, [img, rm, el('span', { class: 'thumb-meta', text: humanSize(a.size) })]));
    });
  };
  const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, capture: 'environment',
    onchange: async e => { for (const file of [...e.target.files]) state.attachments.push(await fileToAttachment(file)); e.target.value = ''; renderThumbs(); } });
  renderThumbs();

  const witnesses = textInput(state.witnesses, v => state.witnesses = v, { placeholder: 'Names of anyone who saw it' });
  return el('div', {}, [
    field('Where were you?', el('div', { class: 'loc-row' }, [locBtn, locStatus])),
    field('Add photos of time clock, pay stub, or messages', fileInput, 'Your own records only. No secret audio — illegal in CA.'),
    thumbs,
    field('Who saw it?', witnesses),
  ]);
}
export function storyBody(state) {
  const narrative = el('textarea', { rows: '4', placeholder: 'Short facts. Names, times, and what was said help.', oninput: e => state.narrative = e.target.value });
  narrative.value = state.narrative || '';
  return field('Tell what happened', narrative);
}
