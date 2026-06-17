// incidentList.js — records review. One concern: listing/expanding/soft-deleting/restoring.
import { el, clear, toast, confirmDialog } from './dom.js';
import { getAllIncidents, getDeletedIncidents, putIncident } from '../data/incidentRepo.js';
import { softDelete, restoreIncident } from '../domain/incidentModel.js';
import { summarize } from '../domain/breakRules.js';
import { labelFor } from '../config/infractionTypes.js';
import { formatDate } from '../domain/timeUtils.js';
import { attachmentUrl } from '../capture/media.js';
import { mapsLink, formatLoc } from '../capture/geo.js';

const fmt = v => (Array.isArray(v) ? v.join(', ') : v === true ? 'Yes' : v === false ? 'No' : v === '' || v == null ? '—' : String(v));

export async function renderIncidentList(container, { onEdit, onChanged } = {}) {
  clear(container);
  const [items, deleted] = await Promise.all([getAllIncidents(), getDeletedIncidents()]);

  if (!items.length && !deleted.length) {
    container.appendChild(el('div', { class: 'empty' }, [
      el('p', { text: 'No records yet.' }),
      el('p', { class: 'hint', text: 'Tap “Log” to add the first one — it takes seconds.' }),
    ]));
    return;
  }

  container.appendChild(el('p', { class: 'count', text: `${items.length} record${items.length === 1 ? '' : 's'}` }));
  items.forEach(item => container.appendChild(row(item, { onEdit, onChanged })));

  if (deleted.length) {
    const wrap = el('details', { class: 'deleted-wrap' }, [el('summary', { text: `Deleted (${deleted.length}) — recoverable` })]);
    deleted.forEach(d => wrap.appendChild(deletedRow(d, { onChanged })));
    container.appendChild(wrap);
  }
}

function chipRow(item) {
  return el('div', { class: 'row-chips' }, (item.types || []).map(t => el('span', { class: 'chip mini', text: labelFor(t) })));
}

function row(item, { onEdit, onChanged }) {
  const flagText = summarize(item.flags || []).join(' · ');
  const meta = [];
  if (item.workplace) meta.push(item.workplace);
  if ((item.attachments || []).length) meta.push(`${item.attachments.length} proof`);
  if (item.location) meta.push('GPS');

  const head = el('button', { type: 'button', class: 'row-head' }, [
    el('div', { class: 'row-main' }, [
      el('div', { class: 'row-date', text: formatDate(item.incidentDate) }),
      chipRow(item),
      flagText ? el('div', { class: 'row-flags', text: flagText }) : null,
    ]),
    el('div', { class: 'row-meta', text: meta.join('  ') }),
  ]);

  const detail = el('div', { class: 'row-detail', hidden: true });
  let built = false;
  head.addEventListener('click', () => {
    detail.hidden = !detail.hidden;
    if (!built) { buildDetail(detail, item, { onEdit, onChanged }); built = true; }
  });
  return el('article', { class: 'row' }, [head, detail]);
}

function buildDetail(host, item, { onEdit, onChanged }) {
  const facts = el('dl', { class: 'facts' });
  const add = (k, v) => { if (v == null || v === '') return; facts.appendChild(el('dt', { text: k })); facts.appendChild(el('dd', { text: String(v) })); };
  add('Started work', item.clockIn); add('Stopped work', item.clockOut);
  if (item.meal?.start || item.meal?.end) add('Lunch', `${item.meal.start || '—'} → ${item.meal.end || '—'}`);
  if (item.meal?.waived) add('Skipped lunch by choice', 'Yes');
  if (item.meal?.interruptedBy) add('Bothered by', item.meal.interruptedBy);
  if (item.meal?.detail) add('What happened', item.meal.detail);
  if (item.meal2?.start || item.meal2?.end) add('Second lunch', `${item.meal2.start || '—'} → ${item.meal2.end || '—'}`);
  if (item.meal2?.waived) add('Skipped 2nd lunch by choice', 'Yes');
  if (item.rest?.taken != null) add('Rest breaks taken', item.rest.taken);
  if (item.offClock?.start || item.offClock?.end) add('Unpaid work', `${item.offClock.start || '—'} → ${item.offClock.end || '—'}`);
  if (item.offClock?.task) add('What you did', item.offClock.task);
  if (item.offClock?.directedBy) add('Who told you to', item.offClock.directedBy);
  if (item.offClock?.employerEdited === true) add('They changed the time record', 'Yes');
  if (item.notice?.to) add('Told', `${item.notice.to} (${item.notice.channel || '—'})`);
  if (item.notice?.response) add('They said', item.notice.response);
  if (item.witnesses) add('Who saw it', item.witnesses);
  if ((item.attachments || []).length) add('Proof saved', `${item.attachments.length} photo(s)`);
  add('Saved at', new Date(item.createdAt).toLocaleString());
  host.appendChild(facts);

  const noted = (item.flags || []).filter(f => f.note);
  if (noted.length) host.appendChild(el('ul', { class: 'flaglist' }, noted.map(f => el('li', { text: f.note }))));
  const hrs = (item.flags || []).find(f => f.key === 'hoursWorked');
  if (hrs) host.appendChild(el('p', { class: 'hint', text: `Hours worked (estimated): ${hrs.value}` }));
  if (item.narrative) host.appendChild(el('p', { class: 'narrative', text: item.narrative }));

  if (item.location) {
    const link = mapsLink(item.location);
    host.appendChild(el('p', { class: 'hint' }, [
      el('span', { text: 'Location: ' + formatLoc(item.location) + '  ' }),
      link ? el('a', { href: link, target: '_blank', rel: 'noopener', text: 'map' }) : null,
    ]));
  }
  if ((item.attachments || []).length) {
    host.appendChild(el('div', { class: 'thumbs' }, item.attachments.map(a => el('img', { class: 'thumb-img', src: attachmentUrl(a), alt: a.name }))));
  }

  const hist = item.editLog || [];
  if (hist.length) {
    host.appendChild(el('details', { class: 'history' }, [
      el('summary', { text: `Edit history (${hist.length})` }),
      ...hist.map(h => el('div', { class: 'hist-entry' }, [
        el('div', { class: 'hint', text: `${new Date(h.at).toLocaleString()} — ${h.note}` }),
        ...(h.changes || []).map(c => el('div', { class: 'hist-change', text: `${c.field}: ${fmt(c.from)} → ${fmt(c.to)}` })),
      ])),
    ]));
  }

  host.appendChild(el('div', { class: 'row-actions' }, [
    el('button', { class: 'btn', text: 'Edit', onclick: () => onEdit?.(item) }),
    el('button', { class: 'btn danger', text: 'Delete', onclick: async () => {
      if (await confirmDialog('Move this record to Deleted? It stays recoverable under “Deleted”.')) {
        await putIncident(softDelete(item)); toast('Moved to Deleted'); onChanged?.();
      }
    } }),
  ]));
}

function deletedRow(item, { onChanged }) {
  return el('article', { class: 'row deleted' }, [
    el('div', { class: 'row-head static' }, [
      el('div', { class: 'row-main' }, [el('div', { class: 'row-date', text: formatDate(item.incidentDate) }), chipRow(item)]),
      el('button', { class: 'btn tiny', text: 'Restore', onclick: async () => { await putIncident(restoreIncident(item)); toast('Restored'); onChanged?.(); } }),
    ]),
  ]);
}
