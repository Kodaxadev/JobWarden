// evidenceFields.js — optional narrative, photo, GPS, and witness capture.
// One concern: add supporting material without blocking the factual record.
import { el, withBusy } from '../ui/dom.js';
import { requestCurrentPosition, formatLoc } from './geo.js';
import { fileToAttachment, attachmentUrl, humanSize } from './media.js';
import { locationStatusCopy, photoStatusCopy } from './evidenceStatus.js';
import { iconEl, field, textInput, section } from './fieldUi.js';

const updateAccessStatus = (node, result) => {
  node.className = `capture-access-status ${result.tone}`;
  node.textContent = result.text;
};

function locationControls(state, onChange) {
  const initial = state.location
    ? { tone: 'success', text: `Added · ${formatLoc(state.location)}` }
    : locationStatusCopy();
  const status = el('span', {
    class: `capture-access-status ${initial.tone}`,
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
    text: initial.text,
  });
  const button = el('button', { type: 'button', class: 'btn' }, [
    iconEl('map-pin'),
    el('span', { class: 'btn-label', text: state.location ? 'Update location' : 'Add location' }),
  ]);
  button.addEventListener('click', async () => {
    let added = false;
    await withBusy(button, 'Checking…', async () => {
      const result = await requestCurrentPosition();
      if (result.location) {
        state.location = result.location;
        added = true;
        updateAccessStatus(status, { tone: 'success', text: `Added · ${formatLoc(result.location)}` });
        onChange?.();
      } else updateAccessStatus(status, locationStatusCopy(result.reason));
    });
    if (added) button.querySelector('.btn-label').textContent = 'Update location';
  });
  return { button, status };
}

function photoControls(state, onChange) {
  const thumbs = el('div', { class: 'thumbs' });
  const status = el('span', {
    class: 'capture-access-status neutral',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  });
  const render = (failed = 0) => {
    thumbs.replaceChildren();
    state.attachments.forEach((attachment, index) => {
      const remove = el('button', {
        type: 'button',
        class: 'thumb-x',
        'aria-label': `Remove ${attachment.name || 'photo'}`,
        onclick: () => { state.attachments.splice(index, 1); render(); onChange?.(); },
      }, [iconEl('x')]);
      thumbs.appendChild(el('div', { class: 'thumb' }, [
        el('img', { src: attachmentUrl(attachment), alt: attachment.name }),
        remove,
        el('span', { class: 'thumb-meta', text: humanSize(attachment.size) }),
      ]));
    });
    updateAccessStatus(status, photoStatusCopy(state.attachments.length, failed));
  };

  const button = el('button', { type: 'button', class: 'btn', onclick: () => input.click() }, [
    iconEl('camera'),
    el('span', { class: 'btn-label', text: 'Add photos' }),
  ]);
  const input = el('input', {
    type: 'file',
    accept: 'image/*',
    multiple: true,
    capture: 'environment',
    class: 'visually-hidden',
    onchange: event => {
      event.stopPropagation();
      const files = [...event.target.files];
      event.target.value = '';
      if (!files.length) return;
      withBusy(button, files.length === 1 ? 'Adding photo…' : `Adding ${files.length} photos…`, async () => {
        let added = 0, failed = 0;
        for (const file of files) {
          if (!/^image\//.test(file.type)) { failed++; continue; }
          try { state.attachments.push(await fileToAttachment(file)); added++; }
          catch { failed++; }
        }
        render(failed);
        if (added) onChange?.();
      });
    },
  });
  render();
  return { button, input, status, thumbs };
}

export function proofSection(state, { onChange } = {}) {
  const narrative = el('textarea', {
    rows: '4',
    placeholder: 'Short facts. Names, times, and what was said help.',
    oninput: event => state.narrative = event.target.value,
  });
  narrative.value = state.narrative || '';
  const photos = photoControls(state, onChange);
  const location = locationControls(state, onChange);

  return section('proof', 'notebook-pen', 'Photos & your words',
    'A photo of the clock, pay stub, or a message backs up what you wrote. Optional.',
    [field('Tell what happened', narrative)],
    [
      el('div', { class: 'field' }, [
        el('span', { class: 'field-label', text: 'Photos of time clock, pay stub, or messages' }),
        el('div', { class: 'loc-row' }, [photos.button, photos.input]),
        photos.status,
        el('span', { class: 'hint', text: 'Your own records only. JobWarden does not record audio. California generally requires every party’s consent before recording a confidential conversation.' }),
      ]),
      photos.thumbs,
      el('div', { class: 'field' }, [
        el('span', { class: 'field-label', text: 'Where were you?' }),
        el('div', { class: 'loc-row' }, [location.button, location.status]),
      ]),
      field('Who saw it?', textInput(state.witnesses, value => state.witnesses = value, {
        placeholder: 'Names of anyone who saw it',
      })),
    ]);
}
