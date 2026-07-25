// confirmDialog.js — one clear decision surface for consequential actions.
import { el, trapFocus } from './dom.js';
import { icon } from './icons.js';

const iconEl = (name) => {
  const host = el('span', { class: 'confirm-icon', 'aria-hidden': 'true' });
  host.innerHTML = icon(name);
  return host;
};

// Mobile Safari does not always focus a button after a tap. Remember the last tapped control
// so closing a dialog can still return the user to the action that opened it.
let lastInvokingControl = null;
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', e => {
    const control = e.target.closest?.('button, a[href], input, select, textarea');
    if (control) lastInvokingControl = control;
  }, true);
}

// Accessible confirm dialog (returns a Promise<boolean>). Focus moves into the dialog,
// stays trapped, Escape and the scrim cancel, and focus returns to the invoking control.
export function confirmDialog(message, {
  title = 'Check before continuing',
  confirmText = 'Continue',
  cancelText = 'Cancel',
  danger = false,
  iconName = danger ? 'trash-2' : 'triangle-alert',
} = {}) {
  return new Promise(resolve => {
    const active = document.activeElement;
    const prevFocus = active && active !== document.body ? active : lastInvokingControl;
    let untrap = () => {};
    const close = (value) => {
      untrap();
      overlay.remove();
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
      resolve(value);
    };
    const titleId = 'dlg-title-' + Math.random().toString(16).slice(2);
    const messageId = 'dlg-message-' + Math.random().toString(16).slice(2);
    const cancelBtn = el('button', {
      type: 'button', class: 'btn confirm-cancel', text: cancelText, onclick: () => close(false),
    });
    const okBtn = el('button', {
      type: 'button',
      class: 'btn confirm-action ' + (danger ? 'danger' : 'primary'),
      text: confirmText,
      onclick: () => close(true),
    });
    const box = el('div', {
      class: 'dialog confirm-dialog' + (danger ? ' is-danger' : ''),
      role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, 'aria-describedby': messageId,
    }, [
      el('div', { class: 'confirm-head' }, [
        iconEl(iconName),
        el('div', { class: 'confirm-copy' }, [
          el('span', { class: 'confirm-kicker', text: danger ? 'This changes a saved record' : 'Review this action' }),
          el('h2', { id: titleId, class: 'confirm-title', text: title }),
        ]),
      ]),
      el('p', { id: messageId, class: 'confirm-message', text: message }),
      el('div', { class: 'dialog-actions' }, [cancelBtn, okBtn]),
    ]);
    const overlay = el('div', { class: 'overlay' }, [box]);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
    document.body.appendChild(overlay);
    untrap = trapFocus(box, () => close(false));
    cancelBtn.focus();
  });
}
