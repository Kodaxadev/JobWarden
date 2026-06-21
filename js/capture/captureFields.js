// captureFields.js — capture state + the field UI, organized as adaptive SECTIONS.
// One concern: the field UI. "What happened?" drives which detail sections appear; each
// section shows its essentials first and tucks the rest behind "More details (optional)".
// The stepper shell is gone; captureForm composes these sections on one screen.
import { el } from '../ui/dom.js';
import { ISSUE_GROUPS } from '../config/uiCopy.js';
import { fieldsForTypes, FIELD } from '../config/infractionTypes.js';
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
    finalPay: { separation: '', lastDay: '', datePaid: '', fullyPaid: null },
    witnesses: '', narrative: '', location: null, attachments: [],
  };
  if (!existing) return base;
  return {
    ...base, types: [...(existing.types || [])],
    incidentDate: existing.incidentDate || base.incidentDate, workplace: existing.workplace || base.workplace,
    clockIn: existing.clockIn || '', clockOut: existing.clockOut || '',
    meal: { ...base.meal, ...(existing.meal || {}) }, meal2: { ...base.meal2, ...(existing.meal2 || {}) },
    rest: { ...base.rest, ...(existing.rest || {}) }, offClock: { ...base.offClock, ...(existing.offClock || {}) },
    notice: { ...base.notice, ...(existing.notice || {}) }, finalPay: { ...base.finalPay, ...(existing.finalPay || {}) },
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
const checkbox = (label, checked, onchange) => el('label', { class: 'check' }, [
  el('input', { type: 'checkbox', checked: !!checked, onchange: e => onchange(e.target.checked) }), el('span', { text: label }),
]);
function triSelect(value, onchange) {
  const sel = el('select', { onchange: e => { const v = e.target.value; onchange(v === '' ? null : v === 'yes'); } });
  [['', '—'], ['yes', 'Yes'], ['no', 'No']].forEach(([v, t]) =>
    sel.appendChild(el('option', { value: v, text: t, selected: (value === true && v === 'yes') || (value === false && v === 'no') })));
  return sel;
}
function timeRow(label, value, setter) {
  const input = el('input', { type: 'time', value: value || '', oninput: e => setter(e.target.value) });
  const now = el('button', { type: 'button', class: 'btn tiny', text: 'Now', onclick: () => { const t = nowTimeStr(); input.value = t; setter(t); } });
  return el('label', { class: 'field' }, [el('span', { class: 'field-label', text: label }), el('div', { class: 'time-row' }, [input, now])]);
}
const dateField = (label, val, setter, hint) => field(label, el('input', { type: 'date', value: val || '', oninput: e => setter(e.target.value) }), hint);

// A detail section: title + one-line "why", essentials, then optional "more details".
function section(id, titleIcon, title, why, essentials, advanced) {
  const kids = [
    el('div', { class: 'logsec-head' }, [iconEl(titleIcon), el('h3', { class: 'logsec-title', text: title })]),
    why ? el('p', { class: 'logsec-why', text: why }) : null,
    ...essentials.filter(Boolean),
  ];
  const adv = (advanced || []).filter(Boolean);
  if (adv.length) {
    kids.push(el('details', { class: 'logsec-more' }, [
      el('summary', {}, [document.createTextNode('More details '), el('span', { class: 'opt', text: 'optional' })]),
      el('div', { class: 'logsec-more-body' }, adv),
    ]));
  }
  return el('section', { class: 'logsec', 'data-sec': id }, kids.filter(Boolean));
}

// ---- "What happened?" (always first) --------------------------------------
function issueChips(state, onChange) {
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
        onChange?.();
      });
      grid.appendChild(btn);
    });
    wrap.appendChild(el('div', { class: 'issue-group' }, [el('div', { class: 'issue-group-label', text: group.label }), grid]));
  });
  return wrap;
}
export function whatHappenedSection(state, { onChange } = {}) {
  const place = textInput(state.workplace, v => state.workplace = v, { list: 'workplaces', placeholder: 'Dealership / place' });
  return el('section', { class: 'logsec what' }, [
    el('div', { class: 'logsec-head' }, [iconEl('triangle-alert'), el('h3', { class: 'logsec-title', text: 'What happened?' })]),
    el('div', { class: 'grid2 what-when' }, [
      dateField('Date', state.incidentDate, v => state.incidentDate = v),
      field('Place', place),
    ]),
    el('p', { class: 'logsec-why', text: 'Tap everything that applies — this decides what we ask next.' }),
    issueChips(state, onChange),
  ]);
}

// ---- detail sections (one per field-group) --------------------------------
function hoursSection(state) {
  return section('hours', 'clock', 'Your hours', 'So we can check whether breaks came in time.',
    [el('div', { class: 'grid2' }, [
      timeRow('Started work', state.clockIn, v => state.clockIn = v),
      timeRow('Stopped work', state.clockOut, v => state.clockOut = v),
    ])]);
}

function lunchSection(state) {
  const m = state.meal;
  const onDuty = () => m.interrupted || m.onCall || m.relievedOfDuty === false;
  const agreeSel = el('select', { onchange: e => m.writtenAgreement = e.target.value });
  [['', 'Not sure'], ['yes', 'Yes'], ['no', 'No']].forEach(([v, t]) =>
    agreeSel.appendChild(el('option', { value: v, text: t, selected: (m.writtenAgreement || '') === v })));
  const agreeField = field('Was there a written, revocable on-duty meal agreement?', agreeSel, 'California allows working through a meal only with a signed, revocable agreement.');
  const sync = () => { agreeField.hidden = !onDuty(); };
  sync();

  const essentials = [
    el('div', { class: 'grid2' }, [
      timeRow('Lunch started', m.start, v => m.start = v),
      timeRow('Lunch ended', m.end, v => m.end = v),
    ]),
    checkbox('I did NOT get a lunch at all', m.taken === false, c => m.taken = c ? false : null),
  ];
  const advanced = [
    checkbox('Someone bothered me during lunch', m.interrupted, c => { m.interrupted = c; sync(); }),
    field('Who bothered you (name / role)', textInput(m.interruptedBy, v => m.interruptedBy = v, { placeholder: 'e.g. manager name' })),
    checkbox('I had to stay reachable (radio / phone / on-call) during lunch', m.onCall, c => { m.onCall = c; sync(); }),
    field('Were you free to leave?', triSelect(m.relievedOfDuty, v => { m.relievedOfDuty = v; sync(); })),
    agreeField,
    checkbox('I skipped lunch by choice', m.waived, c => m.waived = c),
    el('p', { class: 'sub-head', text: 'Second lunch (shift over 10 hours)' }),
    el('div', { class: 'grid2' }, [
      timeRow('2nd lunch started', state.meal2.start, v => state.meal2.start = v),
      timeRow('2nd lunch ended', state.meal2.end, v => state.meal2.end = v),
    ]),
  ];
  return section('lunch', 'sandwich', 'Your lunch', 'When it started, and whether you were really free.', essentials, advanced);
}

function restSection(state) {
  const r = state.rest;
  const count = el('input', { type: 'number', min: '0', max: '6', value: r.taken ?? '', oninput: e => r.taken = e.target.value === '' ? null : Number(e.target.value) });
  return section('rest', 'coffee', 'Your rest breaks', 'Paid 10-minute breaks — about one per 4 hours worked.',
    [field('10-minute rest breaks you took', count)],
    [
      checkbox('A rest break was interrupted', r.interrupted, c => r.interrupted = c),
      checkbox('Kept on call / watching the queue during rest', r.onCall, c => r.onCall = c),
    ]);
}

function unpaidSection(state) {
  const o = state.offClock;
  return section('unpaid', 'footprints', 'Unpaid work', 'Time worked off the clock must still be paid.',
    [
      el('div', { class: 'grid2' }, [
        timeRow('Unpaid work started', o.start, v => o.start = v),
        timeRow('Unpaid work ended', o.end, v => o.end = v),
      ]),
      field('What did you do?', textInput(o.task, v => o.task = v, { placeholder: 'e.g. answered calls before clock-in' })),
    ],
    [
      field('Who told you to (name / role)', textInput(o.directedBy, v => o.directedBy = v)),
      field('Did they change your time record?', triSelect(o.employerEdited, v => o.employerEdited = v)),
    ]);
}

function spokeUpSection(state) {
  const n = state.notice;
  const channel = el('select', { onchange: e => n.channel = e.target.value });
  ['', 'Said it', 'Text', 'Email', 'HR portal', 'Wrote it down'].forEach(o =>
    channel.appendChild(el('option', { value: o, text: o || 'How did you tell them?', selected: n.channel === o })));
  return section('spokeUp', 'message-square', 'After you spoke up', 'A complaint plus what happened next is its own record.',
    [
      field('Who you told (name / role)', textInput(n.to, v => n.to = v)),
      field('Did anything happen after you spoke up?', textInput(n.adverseAction, v => n.adverseAction = v, { placeholder: 'e.g. write-up, schedule cut, an email blaming me' })),
    ],
    [
      field('How you told them', channel),
      field('What they said back', textInput(n.response, v => n.response = v)),
    ]);
}

function finalPaySection(state) {
  const fp = state.finalPay;
  const sep = el('select', { onchange: e => fp.separation = e.target.value });
  [['', 'How did the job end?'], ['fired', 'Fired or laid off'], ['quit_notice', 'I quit with 3+ days notice'], ['quit_no_notice', 'I quit without notice']]
    .forEach(([v, t]) => sep.appendChild(el('option', { value: v, text: t, selected: fp.separation === v })));
  return section('finalPay', 'wallet', 'Your final paycheck', 'When the job ends, final pay has strict timing.',
    [
      field('How the job ended', sep),
      el('div', { class: 'grid2' }, [
        dateField('Last day you worked', fp.lastDay, v => fp.lastDay = v),
        dateField('Date final pay arrived', fp.datePaid, v => fp.datePaid = v, 'Leave blank if not paid yet.'),
      ]),
      field('Were you paid everything you were owed?', triSelect(fp.fullyPaid, v => fp.fullyPaid = v)),
    ]);
}

const SECTION_DEFS = [
  { id: 'hours', needs: f => f.includes(FIELD.CLOCK), render: hoursSection },
  { id: 'lunch', needs: f => f.includes(FIELD.MEAL) || f.includes(FIELD.MEAL2), render: lunchSection },
  { id: 'rest', needs: f => f.includes(FIELD.REST), render: restSection },
  { id: 'unpaid', needs: f => f.includes(FIELD.OFFCLOCK), render: unpaidSection },
  { id: 'spokeUp', needs: f => f.includes(FIELD.NOTICE), render: spokeUpSection },
  { id: 'finalPay', needs: f => f.includes(FIELD.FINALPAY), render: finalPaySection },
];

// The detail sections relevant to what the user picked, in a sensible order.
export function activeSections(state) {
  const f = fieldsForTypes(state.types);
  return SECTION_DEFS.filter(d => d.needs(f)).map(d => d.render(state));
}

// ---- Proof & your words (always available, optional) ----------------------
export function proofSection(state) {
  const narrative = el('textarea', { rows: '4', placeholder: 'Short facts. Names, times, and what was said help.', oninput: e => state.narrative = e.target.value });
  narrative.value = state.narrative || '';

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
      const rm = el('button', { type: 'button', class: 'thumb-x', text: '×', 'aria-label': 'Remove photo', onclick: () => { state.attachments.splice(idx, 1); renderThumbs(); } });
      thumbs.appendChild(el('div', { class: 'thumb' }, [el('img', { src: attachmentUrl(a), alt: a.name }), rm, el('span', { class: 'thumb-meta', text: humanSize(a.size) })]));
    });
  };
  const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, capture: 'environment',
    onchange: async e => { for (const f of [...e.target.files]) state.attachments.push(await fileToAttachment(f)); e.target.value = ''; renderThumbs(); } });
  renderThumbs();

  return section('proof', 'notebook-pen', 'Proof & your words',
    'A photo of the clock, pay stub, or a message makes your record far stronger. Optional.',
    [field('Tell what happened', narrative)],
    [
      field('Photos of time clock, pay stub, or messages', fileInput, 'Your own records only. No secret audio — illegal in CA.'),
      thumbs,
      field('Where were you?', el('div', { class: 'loc-row' }, [locBtn, locStatus])),
      field('Who saw it?', textInput(state.witnesses, v => state.witnesses = v, { placeholder: 'Names of anyone who saw it' })),
    ]);
}
