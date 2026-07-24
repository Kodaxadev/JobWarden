// quickCapture.js — the <5-second "interrupted lunch" path. One concern: capturing a single
// interruption as a standalone, timestamped, sealed record the moment it happens — zero typing
// required. The fact is the strongest evidence when it's saved AT the interruption, not later.
import { el, clear, toast, trapFocus } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { createIncident } from '../domain/incidentModel.js';
import { addIncident } from '../data/incidentRepo.js';
import { getSettings } from '../data/settingsRepo.js';
import { reportSaveFailure } from '../ui/saveFailure.js';
import { fileToAttachment, attachmentUrl, humanSize } from './media.js';
import { todayDateStr } from '../domain/timeUtils.js';

const WHO = ['Manager', 'Supervisor', 'Coworker', 'Customer', 'Other'];

// Pure: assemble the incident input. Kept DOM-free so it can be unit-tested.
export function interruptedLunchInput({ by = '', name = '', returnedToWork = true, note = '', workplace = '', attachments = [] } = {}) {
  const interruptedBy = [by, name.trim()].filter(Boolean).join(' — ');
  return {
    incidentDate: todayDateStr(),
    workplace,
    types: ['interrupted_meal'],
    meal: {
      interrupted: true,
      interruptedBy,
      relievedOfDuty: returnedToWork ? false : null, // "returned to work" = not relieved of all duty
      writtenAgreement: '',                           // unknown — never assert it here
    },
    narrative: note.trim(),
    attachments,
  };
}

const iconEl = (n) => { const s = el('span'); s.innerHTML = icon(n); return s.firstElementChild || s; };

export async function openInterruptedLunch({ onSaved } = {}) {
  const settings = await getSettings();
  const workplace = (settings.workplaces || [])[0] || '';
  const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const prevFocus = document.activeElement;

  let by = '';
  const attachments = [];

  let untrap = () => {};
  const close = () => {
    untrap();
    overlay.remove();
    if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
  };

  // who-interrupted chips (single select)
  const chips = WHO.map(label => el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', text: label }));
  chips.forEach(btn => btn.addEventListener('click', () => {
    by = btn.textContent;
    chips.forEach(c => { const on = c === btn; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }));

  const nameInput = el('input', { type: 'text', placeholder: 'Name (optional)' });
  const returnedCb = el('input', { type: 'checkbox', checked: true });
  const note = el('textarea', { rows: '2', placeholder: 'What happened (optional)' });

  const thumbs = el('div', { class: 'thumbs' });
  const fileInput = el('input', { type: 'file', accept: 'image/*', hidden: true });
  const renderThumbs = () => {
    clear(thumbs);
    attachments.forEach((a, i) => {
      const rm = el('button', { type: 'button', class: 'thumb-x', text: '×', 'aria-label': 'Remove photo', onclick: () => { attachments.splice(i, 1); renderThumbs(); } });
      thumbs.appendChild(el('div', { class: 'thumb' }, [el('img', { src: attachmentUrl(a), alt: a.name }), rm, el('span', { class: 'thumb-meta', text: humanSize(a.size) })]));
    });
  };
  fileInput.addEventListener('change', async e => {
    for (const file of e.target.files) { const a = await fileToAttachment(file); if (a) attachments.push(a); }
    fileInput.value = ''; renderThumbs();
  });
  const photoBtn = el('button', { type: 'button', class: 'btn', onclick: () => fileInput.click() }, [iconEl('camera'), document.createTextNode(' Add photo')]);

  const save = async () => {
    const input = interruptedLunchInput({ by, name: nameInput.value, returnedToWork: returnedCb.checked, note: note.value, workplace, attachments });
    const draft = createIncident(input);
    try {
      await addIncident(draft);
      toast('Interrupted lunch saved');
      close();
      onSaved?.();
    } catch (err) {
      // Same contract as the full Log screen: a failed save blocks and offers the
      // drop-the-photos trade, because this is evidence, not a form (see saveFailure.js).
      const r = await reportSaveFailure(err, draft, (rec) => addIncident(rec));
      if (r.saved) { close(); onSaved?.(); }
    }
  };

  const titleId = 'qc-' + Math.random().toString(16).slice(2);
  const sheet = el('div', { class: 'dialog quick-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [
    el('div', { class: 'quick-head' }, [
      el('h2', { id: titleId, text: 'Interrupted lunch' }),
      el('span', { class: 'quick-now', text: now }),
    ]),
    el('p', { class: 'field-label', text: 'Who interrupted you?' }),
    el('div', { class: 'quick-chips' }, chips),
    nameInput,
    el('label', { class: 'check' }, [returnedCb, el('span', { text: 'I returned to work during the meal' })]),
    note,
    thumbs,
    el('div', { class: 'quick-actions' }, [
      photoBtn, fileInput,
      el('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: close }),
      el('button', { type: 'button', class: 'btn primary', text: 'Save', onclick: save }),
    ]),
  ]);
  const overlay = el('div', { class: 'overlay' }, [sheet]);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.body.appendChild(overlay);
  untrap = trapFocus(sheet, close);
  chips[0].focus();
}
