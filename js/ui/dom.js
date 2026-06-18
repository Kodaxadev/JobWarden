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

// Accessible confirm dialog (returns a Promise<boolean>). role=dialog + aria-modal,
// focus moves into the dialog and is trapped, Escape cancels, focus returns to the trigger.
export function confirmDialog(message, { confirmText = 'Delete', cancelText = 'Cancel' } = {}) {
  return new Promise(resolve => {
    const prevFocus = document.activeElement;
    const close = (val) => {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
      resolve(val);
    };
    const cancelBtn = el('button', { class: 'btn', text: cancelText, onclick: () => close(false) });
    const okBtn = el('button', { class: 'btn danger', text: confirmText, onclick: () => close(true) });
    const msgId = 'dlg-' + Math.random().toString(16).slice(2);
    const box = el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': msgId }, [
      el('p', { id: msgId, text: message }),
      el('div', { class: 'dialog-actions' }, [cancelBtn, okBtn]),
    ]);
    const overlay = el('div', { class: 'overlay' }, [box]);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });
    const focusables = [cancelBtn, okBtn];
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
      else if (e.key === 'Tab') {
        const i = focusables.indexOf(document.activeElement);
        const next = e.shiftKey ? (i <= 0 ? focusables.length - 1 : i - 1) : (i + 1) % focusables.length;
        e.preventDefault(); focusables[next].focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(overlay);
    cancelBtn.focus();
  });
}
