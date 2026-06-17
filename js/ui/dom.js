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
  if (!t) { t = el('div', { class: 'toast' }); document.body.appendChild(t); }
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// Minimal confirm dialog (returns a Promise<boolean>) so we don't rely on window.confirm styling.
export function confirmDialog(message) {
  return new Promise(resolve => {
    const overlay = el('div', { class: 'overlay' });
    const box = el('div', { class: 'dialog' }, [
      el('p', { text: message }),
      el('div', { class: 'dialog-actions' }, [
        el('button', { class: 'btn', text: 'Cancel', onclick: () => { overlay.remove(); resolve(false); } }),
        el('button', { class: 'btn danger', text: 'Delete', onclick: () => { overlay.remove(); resolve(true); } }),
      ]),
    ]);
    overlay.appendChild(box);
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    document.body.appendChild(overlay);
  });
}
