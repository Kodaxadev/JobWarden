// passphraseDialog.js — asking for the backup passphrase. One concern: the two modal
// surfaces around encrypted backups (choose one, enter one).
//
// The hard part here is not the crypto, it is the honesty: a forgotten passphrase means
// the evidence file is gone for good. That warning is not fine print — it sits above the
// fields, in the same size as everything else.
import { el, trapFocus } from './dom.js';
import { passphraseStrength } from '../export/backupCrypto.js';

const uid = () => 'pp-' + Math.random().toString(16).slice(2);

// Shared modal shell: builds the overlay, traps focus, restores it on close.
function openDialog(title, buildBody, { confirmText, onConfirm }) {
  return new Promise(resolve => {
    const prevFocus = document.activeElement;
    let untrap = () => {};
    const close = (val) => {
      untrap();
      overlay.remove();
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
      resolve(val);
    };
    const titleId = uid();
    const error = el('p', { class: 'pp-error', role: 'alert' });
    const okBtn = el('button', { class: 'btn primary', text: confirmText });
    const body = buildBody({ okBtn, error, close });
    okBtn.addEventListener('click', () => {
      const problem = onConfirm(close);
      error.textContent = problem || '';
    });
    const box = el('div', { class: 'dialog pp-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [
      el('h3', { id: titleId, class: 'pp-title', text: title }),
      ...body,
      error,
      el('div', { class: 'dialog-actions' }, [
        el('button', { class: 'btn', text: 'Cancel', onclick: () => close(null) }),
        okBtn,
      ]),
    ]);
    const overlay = el('div', { class: 'overlay' }, [box]);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });
    document.body.appendChild(overlay);
    untrap = trapFocus(box, () => close(null));
    box.querySelector('input')?.focus();
  });
}

const field = (labelText, id, hint) => {
  const input = el('input', { type: 'password', id, autocomplete: 'new-password', class: 'pp-input' });
  const wrap = el('div', { class: 'pp-field' }, [
    el('label', { for: id, text: labelText }),
    input,
    hint ? el('p', { class: 'pp-hint', text: hint }) : null,
  ]);
  return { wrap, input };
};

// Choose a passphrase for a new encrypted backup. Resolves to the passphrase, or null.
export function choosePassphrase() {
  const a = field('Passphrase', uid());
  const b = field('Type it again', uid());
  const meter = el('p', { class: 'pp-meter', 'aria-live': 'polite' });
  a.input.addEventListener('input', () => {
    const s = passphraseStrength(a.input.value);
    meter.textContent = a.input.value ? s.text : '';
    meter.className = 'pp-meter ' + s.level;
  });

  return openDialog('Lock this backup', ({ okBtn }) => {
    okBtn.textContent = 'Save locked backup';
    return [
      el('p', { class: 'pp-warn', text: 'If you forget this passphrase, the backup can never be opened — not by you, not by us. Write it down somewhere safe before you continue.' }),
      el('p', { class: 'pp-hint', text: 'A short sentence you will remember works well, like "blue tractor lunch 41".' }),
      a.wrap, meter, b.wrap,
    ];
  }, {
    confirmText: 'Save locked backup',
    onConfirm: (close) => {
      const pass = a.input.value;
      if (pass.length < 8) return 'Use at least 8 characters.';
      if (pass !== b.input.value) return 'The two passphrases do not match.';
      close(pass);
      return '';
    },
  });
}

// Ask for the passphrase of an existing encrypted backup. Resolves to it, or null.
// `retry` is set after a failed attempt, so the second ask says why it is asking again.
export function askPassphrase(retry = false) {
  const a = field('Passphrase', uid(), 'The passphrase you chose when you saved this backup.');
  a.input.autocomplete = 'current-password';
  return openDialog(retry ? 'That did not open it' : 'This backup is locked', () => [
    el('p', { class: retry ? 'pp-warn' : 'pp-hint', text: retry
      ? 'Wrong passphrase, or this file was changed after it was saved. Try again — capital letters and spaces count.'
      : 'Enter the passphrase to open it.' }),
    a.wrap,
  ], {
    confirmText: 'Open backup',
    onConfirm: (close) => {
      if (!a.input.value) return 'Enter the passphrase.';
      close(a.input.value);
      return '';
    },
  });
}
