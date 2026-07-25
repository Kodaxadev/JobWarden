// actionRow.js — one mobile action-cell pattern for navigation and document actions.
import { el } from './dom.js';
import { icon } from './icons.js';

const iconEl = (name) => {
  const span = el('span');
  span.innerHTML = icon(name);
  return span.firstElementChild || span;
};

export function actionRow({
  label,
  description,
  iconName,
  variant = '',
  onClick,
}) {
  const button = el('button', {
    type: 'button',
    class: `action-row${variant ? ` ${variant}` : ''}`,
  }, [
    el('span', { class: 'action-row-icon' }, [iconEl(iconName)]),
    el('span', { class: 'action-row-copy' }, [
      el('span', { class: 'action-row-title btn-label', text: label }),
      el('span', { class: 'action-row-description', text: description }),
    ]),
    el('span', { class: 'action-row-chevron' }, [iconEl('chevron-right')]),
  ]);
  if (onClick) button.addEventListener('click', () => onClick(button));
  return button;
}

export function backButton(onClick) {
  return el('button', { type: 'button', class: 'back-button', onclick: onClick }, [
    el('span', { class: 'back-button-icon' }, [iconEl('chevron-left')]),
    el('span', { text: 'Back' }),
  ]);
}
