// fieldUi.js — shared capture-form primitives. One concern: consistent labels,
// optional-detail sections, and time/date controls across every fact pattern.
import { el } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { nowTimeStr } from '../domain/timeUtils.js';

export const iconEl = (name) => {
  const span = el('span');
  span.innerHTML = icon(name);
  return span.firstElementChild || span;
};

export const field = (label, input, hint) => el('label', { class: 'field' }, [
  el('span', { class: 'field-label', text: label }),
  input,
  hint ? el('span', { class: 'hint', text: hint }) : null,
]);

export const textInput = (value, oninput, attrs = {}) =>
  el('input', { type: 'text', value: value || '', oninput: e => oninput(e.target.value), ...attrs });

export const checkbox = (label, checked, onchange) => el('label', { class: 'check' }, [
  el('input', { type: 'checkbox', checked: !!checked, onchange: e => onchange(e.target.checked) }),
  el('span', { text: label }),
]);

export function triSelect(value, onchange) {
  const select = el('select', {
    onchange: e => {
      const next = e.target.value;
      onchange(next === '' ? null : next === 'yes');
    },
  });
  [['', 'Not sure / not entered'], ['yes', 'Yes'], ['no', 'No']].forEach(([key, label]) =>
    select.appendChild(el('option', {
      value: key,
      text: label,
      selected: (value === true && key === 'yes') || (value === false && key === 'no'),
    })));
  return select;
}

export function selectInput(value, options, onchange) {
  const select = el('select', { onchange: e => onchange(e.target.value) });
  options.forEach(([key, label]) =>
    select.appendChild(el('option', { value: key, text: label, selected: value === key })));
  return select;
}

export function timeRow(label, value, setter) {
  const input = el('input', { type: 'time', value: value || '', oninput: e => setter(e.target.value) });
  const now = el('button', {
    type: 'button',
    class: 'btn tiny',
    text: 'Now',
    onclick: () => {
      const next = nowTimeStr();
      input.value = next;
      setter(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
  });
  return field(label, el('div', { class: 'time-row' }, [input, now]));
}

export const dateField = (label, value, setter, hint) =>
  field(label, el('input', {
    type: 'date',
    value: value || '',
    oninput: e => setter(e.target.value),
  }), hint);

export function section(id, titleIcon, title, why, essentials, advanced) {
  const children = [
    el('div', { class: 'logsec-head' }, [iconEl(titleIcon), el('h3', { class: 'logsec-title', text: title })]),
    why ? el('p', { class: 'logsec-why', text: why }) : null,
    ...essentials.filter(Boolean),
  ];
  const optional = (advanced || []).filter(Boolean);
  if (optional.length) {
    children.push(el('details', { class: 'logsec-more' }, [
      el('summary', { 'aria-label': `More details for ${title}` }, [
        el('span', { class: 'logsec-more-copy' }, [
          document.createTextNode('More details '),
          el('span', { class: 'opt', text: 'optional' }),
        ]),
        el('span', { class: 'logsec-more-chevron', 'aria-hidden': 'true' }, [
          iconEl('chevron-down'),
        ]),
      ]),
      el('div', { class: 'logsec-more-body' }, optional),
    ]));
  }
  return el('section', { class: 'logsec', 'data-sec': id }, children.filter(Boolean));
}
