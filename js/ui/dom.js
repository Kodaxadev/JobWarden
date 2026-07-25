// dom.js — tiny DOM helpers. One concern: element creation/selection/notification.
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

// el('button', {class:'x', onclick: fn, text:'Hi'}, [childNode|string])
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null || c === false) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

export function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

let _toastTimer = null;
export function toast(msg, ms = 2600) {
  let t = qs('.toast');
  if (!t) { t = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }); document.body.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// Run an async action with the button showing it. One vocabulary for every slow thing in the
// app — locking a backup derives a key for a couple of seconds, building a report inlines
// every photo — so the control never sits there looking inert while work happens behind it.
// Restores the original label whatever happens, including on a thrown error.
export async function withBusy(button, busyLabel, fn) {
  if (!button) return fn();
  const label = button.querySelector('.btn-label');
  const original = label ? label.textContent : button.textContent;
  const setLabel = (t) => { if (label) label.textContent = t; else button.textContent = t; };
  button.setAttribute('aria-busy', 'true');
  button.disabled = true;
  if (busyLabel) setLabel(busyLabel);
  try {
    return await fn();
  } finally {
    button.removeAttribute('aria-busy');
    button.disabled = false;
    setLabel(original);
  }
}

// Trap Tab focus within `container`; route Escape to onEscape. Returns a cleanup fn.
// One implementation for every modal surface (confirm dialog, quick-capture sheet).
const FOCUSABLE = 'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])';
export function trapFocus(container, onEscape) {
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onEscape?.(); return; }
    if (e.key !== 'Tab') return;
    const f = [...container.querySelectorAll(FOCUSABLE)].filter(x => !x.hidden && !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    const next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : ((i + 1) % f.length);
    e.preventDefault();
    f[next].focus();
  };
  document.addEventListener('keydown', onKey, true);
  return () => document.removeEventListener('keydown', onKey, true);
}

// Accessible confirm dialog (returns a Promise<boolean>). role=dialog + aria-modal,
// focus moves into the dialog and is trapped, Escape cancels, focus returns to the trigger.
export function confirmDialog(message, { confirmText = 'Delete', cancelText = 'Cancel', danger = true } = {}) {
  return new Promise(resolve => {
    const prevFocus = document.activeElement;
    let untrap = () => {};
    const close = (val) => {
      untrap();
      overlay.remove();
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
      resolve(val);
    };
    const cancelBtn = el('button', { class: 'btn', text: cancelText, onclick: () => close(false) });
    const okBtn = el('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), text: confirmText, onclick: () => close(true) });
    const msgId = 'dlg-' + Math.random().toString(16).slice(2);
    const box = el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': msgId }, [
      el('p', { id: msgId, text: message }),
      el('div', { class: 'dialog-actions' }, [cancelBtn, okBtn]),
    ]);
    const overlay = el('div', { class: 'overlay' }, [box]);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
    document.body.appendChild(overlay);
    untrap = trapFocus(box, () => close(false));
    cancelBtn.focus();
  });
}
