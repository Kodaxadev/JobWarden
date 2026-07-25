// systemStatus.js — persistent app-wide offline and update states.
// One concern: keep important shell status visible until the person can act on it.
import { clear, el } from './dom.js';
import { icon } from './icons.js';

const iconEl = (name) => {
  const span = el('span');
  span.innerHTML = icon(name);
  return span.firstElementChild || span;
};

function statusBanner({ kind, iconName, title, detail, actionLabel, onAction }) {
  const children = [
    el('span', { class: 'system-banner-icon', 'aria-hidden': 'true' }, [iconEl(iconName)]),
    el('span', { class: 'system-banner-copy' }, [
      el('strong', { text: title }),
      el('span', { text: detail }),
    ]),
  ];
  if (actionLabel) {
    children.push(el('button', {
      type: 'button',
      class: 'btn tiny system-banner-action',
      onclick: onAction,
      text: actionLabel,
    }));
  }
  return el('section', {
    class: `system-banner ${kind}`,
    role: 'status',
    'aria-atomic': 'true',
  }, children);
}

export function systemStatusState({ online, updateReady }) {
  if (updateReady) return {
    kind: 'update',
    iconName: 'refresh-cw',
    title: 'Update ready',
    detail: 'Finish any unsaved entry, then load the newest JobWarden.',
    actionLabel: 'Update now',
  };
  if (!online) return {
    kind: 'offline',
    iconName: 'wifi-off',
    title: 'Working offline',
    detail: 'Logging and saved records still work on this phone.',
  };
  return null;
}

export function bindSystemStatus(host, { onApplyUpdate } = {}) {
  let online = navigator.onLine;
  let updateReady = false;

  const draw = () => {
    clear(host);
    const state = systemStatusState({ online, updateReady });
    if (state) host.appendChild(statusBanner({ ...state, onAction: onApplyUpdate }));
  };

  const wentOffline = () => { online = false; draw(); };
  const wentOnline = () => { online = true; draw(); };
  window.addEventListener('offline', wentOffline);
  window.addEventListener('online', wentOnline);
  draw();

  return {
    showUpdateReady() { updateReady = true; draw(); },
    destroy() {
      window.removeEventListener('offline', wentOffline);
      window.removeEventListener('online', wentOnline);
    },
  };
}
