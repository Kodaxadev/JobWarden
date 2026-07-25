// statusUi.js — reusable empty, loading, healthy, and warning states.
import { el } from './dom.js';
import { icon } from './icons.js';

const iconEl = (name) => {
  const host = el('span');
  host.innerHTML = icon(name);
  return host.firstElementChild || host;
};

export function emptyState({
  title,
  description,
  iconName = 'shield-check',
  actionLabel,
  onAction,
  compact = false,
  headingLevel = 2,
}) {
  const heading = headingLevel === 3 ? 'h3' : 'h2';
  return el('div', { class: `feedback-empty${compact ? ' compact' : ''}` }, [
    el('div', { class: 'feedback-empty-icon', 'aria-hidden': 'true' }, [iconEl(iconName)]),
    el(heading, { class: 'feedback-empty-title', text: title }),
    el('p', { class: 'feedback-empty-description', text: description }),
    actionLabel && onAction ? el('button', {
      type: 'button',
      class: 'btn primary feedback-empty-action',
      text: actionLabel,
      onclick: onAction,
    }) : null,
  ]);
}

export function statusRow({
  label,
  detail,
  iconName = 'message-square',
  tone = 'neutral',
  live = false,
}) {
  return el('div', {
    class: `status-row ${tone}`,
    role: live ? 'status' : null,
    'aria-live': live ? 'polite' : null,
    'aria-atomic': live ? 'true' : null,
  }, [
    el('span', { class: 'status-row-icon', 'aria-hidden': 'true' }, [iconEl(iconName)]),
    el('span', { class: 'status-row-copy' }, [
      el('strong', { class: 'status-row-label', text: label }),
      el('span', { class: 'status-row-detail', text: detail }),
    ]),
  ]);
}

export function updateStatusRow(row, {
  label,
  detail,
  iconName = 'message-square',
  tone = 'neutral',
}) {
  row.className = `status-row ${tone}`;
  row.querySelector('.status-row-icon').innerHTML = icon(iconName);
  row.querySelector('.status-row-label').textContent = label;
  row.querySelector('.status-row-detail').textContent = detail;
}
