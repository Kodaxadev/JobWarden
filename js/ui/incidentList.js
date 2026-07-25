// incidentList.js — records review. One concern: listing/expanding/soft-deleting/restoring.
import { el, clear, toast, confirmDialog } from './dom.js';
import { icon } from './icons.js';
import { getAllIncidents, getDeletedIncidents, putIncident } from '../data/incidentRepo.js';
import { softDelete, restoreIncident } from '../domain/incidentModel.js';
import { verifyIntegrity } from '../domain/integrity.js';
import { getRules } from '../rules/index.js';
import { WHAT_FINDINGS_MEAN } from '../config/disclaimers.js';
import { summarizePatterns } from '../domain/patterns.js';
import { labelFor } from '../config/infractionTypes.js';
import { formatDate } from '../domain/timeUtils.js';
import { attachmentUrl } from '../capture/media.js';
import { mapsLink, formatLoc } from '../capture/geo.js';
import { getSettings } from '../data/settingsRepo.js';
import { openPrintSummary } from '../export/exportSummary.js';
import { payStubIssueLabel, tipProblemLabel, sickActionLabel } from '../config/payIssueOptions.js';

const fmt = v => (Array.isArray(v) ? v.join(', ') : v === true ? 'Yes' : v === false ? 'No' : v === '' || v == null ? '—' : String(v));

export async function renderIncidentList(container, { onEdit, onChanged, onRepeat } = {}) {
  clear(container);
  const [items, deleted] = await Promise.all([getAllIncidents(), getDeletedIncidents()]);

  if (!items.length && !deleted.length) {
    container.appendChild(emptyState());
    return;
  }

  if (items.length) container.appendChild(glanceCard(items));

  // Filter + month-grouped list — the Records screen has to stay usable at hundreds of records,
  // and "show me the missed meals at location X" is how a record actually gets used.
  const filter = { q: '', type: '', workplace: '' };
  const countEl = el('p', { class: 'count' });
  const scopedBar = el('div', { class: 'scoped-export' });
  const listHost = el('div', { class: 'rec-list' });
  if (items.length > 6) container.appendChild(filterBar(items, filter, apply));
  container.append(countEl, scopedBar, listHost);
  apply();

  function apply() {
    const list = items.filter(i => matchesFilter(i, filter));
    const filtered = list.length !== items.length;
    countEl.textContent = filtered
      ? `${list.length} of ${items.length} records`
      : `${items.length} record${items.length === 1 ? '' : 's'}`;

    // Filtered view → export exactly this subset (e.g. "just employer A, for a lawyer").
    clear(scopedBar);
    if (filtered && list.length) {
      scopedBar.appendChild(el('button', { type: 'button', class: 'btn tiny', onclick: async () => {
        const ok = await openPrintSummary(list, await getSettings());
        if (!ok) toast('Allow pop-ups to make the report');
      } }, [document.createTextNode(`Make a report of these ${list.length}`)]));
    }

    clear(listHost);
    if (!list.length) {
      listHost.appendChild(el('p', { class: 'hint filter-empty', text: 'No records match. Clear the filters to see everything.' }));
      return;
    }
    for (const [label, group] of groupByMonth(list)) {
      listHost.appendChild(el('h3', { class: 'month-head', text: label }));
      group.forEach(item => listHost.appendChild(row(item, { onEdit, onChanged, onRepeat })));
    }
  }

  if (deleted.length) {
    const wrap = el('details', { class: 'deleted-wrap' }, [el('summary', { text: `Deleted (${deleted.length}) — recoverable` })]);
    deleted.forEach(d => wrap.appendChild(deletedRow(d, { onChanged })));
    container.appendChild(wrap);
  }
}

const iconEl = (n) => { const s = el('span'); s.innerHTML = icon(n); return s.firstElementChild || s; };

// First-run empty state that teaches what the tool does, not just "nothing here".
function emptyState() {
  return el('div', { class: 'empty teach' }, [
    el('div', { class: 'empty-mark' }, [iconEl('shield-check')]),
    el('p', { class: 'empty-title', text: 'Your record starts here' }),
    el('p', { class: 'hint', text: 'When something happens at work — a skipped lunch, unpaid minutes, a break cut short — log it in seconds. JobWarden stamps the time, fingerprints the record, and lists any later edits.' }),
    el('p', { class: 'hint', text: 'Tap Log below to add the first one.' }),
  ]);
}

function matchesFilter(i, f) {
  if (f.type && !(i.types || []).includes(f.type)) return false;
  if (f.workplace && i.workplace !== f.workplace) return false;
  if (f.q) {
    const hay = `${i.workplace || ''} ${i.narrative || ''} ${i.witnesses || ''}`.toLowerCase();
    if (!hay.includes(f.q.toLowerCase())) return false;
  }
  return true;
}

const monthLabel = (ym) => {
  const [y, m] = String(ym).split('-').map(Number);
  if (!y) return 'Undated';
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
};

// Group a newest-first list into [monthLabel, records] pairs, order preserved.
function groupByMonth(list) {
  const groups = new Map();
  for (const i of list) {
    const key = (i.incidentDate || '').slice(0, 7) || 'unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  return [...groups.entries()].map(([key, g]) => [monthLabel(key), g]);
}

function filterBar(items, filter, apply) {
  const types = [...new Set(items.flatMap(i => i.types || []))];
  const places = [...new Set(items.map(i => i.workplace).filter(Boolean))];
  const search = el('input', { type: 'search', class: 'rec-search', placeholder: 'Search notes, place, names', 'aria-label': 'Search records', oninput: e => { filter.q = e.target.value; apply(); } });
  const typeSel = el('select', { 'aria-label': 'Filter by issue', onchange: e => { filter.type = e.target.value; apply(); } },
    [el('option', { value: '', text: 'All issues' }), ...types.map(t => el('option', { value: t, text: labelFor(t) }))]);
  const kids = [search, typeSel];
  if (places.length > 1) {
    kids.push(el('select', { 'aria-label': 'Filter by place', onchange: e => { filter.workplace = e.target.value; apply(); } },
      [el('option', { value: '', text: 'All places' }), ...places.map(p => el('option', { value: p, text: p }))]));
  }
  return el('div', { class: 'rec-filter' }, kids);
}

function chipRow(item) {
  return el('div', { class: 'row-chips' }, (item.types || []).map(t => el('span', { class: 'chip mini', text: labelFor(t) })));
}

// "Pattern" layer: a plain-language roll-up so a recurring problem is visible at a glance.
function glanceCard(items) {
  const s = summarizePatterns(items);
  const kpi = (num, label) => el('div', { class: 'kpi' }, [
    el('span', { class: 'kpi-num', text: String(num) }),
    el('span', { class: 'kpi-label', text: label }),
  ]);
  const stats = s.headline.slice(0, 5).map(h => kpi(h.count, h.label));
  if (s.offClock.records) stats.push(kpi(`${s.offClock.totalMinutes} min`, 'Off the clock'));

  const range = s.range.from
    ? `${formatDate(s.range.from)} – ${formatDate(s.range.to)} (${s.range.span})`
    : '';
  const intr = s.interruptions;
  const interruptLine = intr.total > 0 && intr.byActor.length
    ? el('p', { class: 'glance-interrupt', text: `Lunch interrupted ${intr.total}× — ${intr.byActor.map(a => `${a.actor} (${a.count})`).join(', ')}` })
    : null;

  const ot = s.weeklyOvertime;
  const otLine = ot && ot.count > 0
    ? el('p', { class: 'glance-interrupt', text: `${ot.count} week${ot.count === 1 ? '' : 's'} over 40 hours (${ot.totalOtHours}h total over 40, Sun–Sat) — possible weekly overtime. Your employer's workweek may start on another day; confirm it.` })
    : null;

  // Statute-of-limitations nudge: facts + route to help, no per-claim deadline math.
  const oldestDays = s.range.from ? Math.floor((Date.now() - Date.parse(s.range.from + 'T00:00:00')) / 86400000) : 0;
  const solLine = oldestDays >= 730
    ? el('p', { class: 'glance-sol', text: `Your oldest record is over ${Math.floor(oldestDays / 365)} years old. Many wage claims have filing deadlines (often around three years, some shorter) — it's worth getting advice before they pass.` })
    : null;

  return el('section', { class: 'card glance' }, [
    el('h2', { text: 'Your records at a glance' }),
    el('p', { class: 'glance-range', text: `${items.length} shift${items.length === 1 ? '' : 's'} logged${range ? ` · ${range}` : ''}` }),
    stats.length
      ? el('div', { class: 'kpi-grid' }, stats)
      : el('p', { class: 'hint', text: 'No possible issues flagged yet.' }),
    interruptLine,
    otLine,
    solLine,
    el('p', { class: 'glance-foot hint', text: `${s.reportedCount} reported · ${s.withProofCount} with photos. Make a one-page summary in Export.` }),
    // The counts above are the most misreadable thing in the app — "3 No lunch" can look
    // like a verdict. Say what a possible issue is, next to the number, not in a policy page.
    el('details', { class: 'glance-means' }, [
      el('summary', { text: 'What does “possible issue” mean?' }),
      ...WHAT_FINDINGS_MEAN.map(t => el('p', { class: 'hint', text: t })),
    ]),
  ]);
}

function row(item, { onEdit, onChanged, onRepeat }) {
  const flagText = getRules(item.jurisdiction).summarize(item.flags || []).join(' · ');
  const meta = [];
  if (item.workplace) meta.push(item.workplace);
  if ((item.attachments || []).length) meta.push(`${item.attachments.length} photo${item.attachments.length === 1 ? '' : 's'}`);
  if (item.location) meta.push('GPS');

  const detailId = 'rec-' + item.id;
  const head = el('button', { type: 'button', class: 'row-head', 'aria-expanded': 'false', 'aria-controls': detailId }, [
    el('div', { class: 'row-main' }, [
      el('div', { class: 'row-date', text: formatDate(item.incidentDate) }),
      chipRow(item),
      flagText ? el('div', { class: 'row-flags', text: flagText }) : null,
    ]),
    el('div', { class: 'row-meta', text: meta.join('  ') }),
  ]);

  const detail = el('div', { class: 'row-detail', id: detailId, hidden: true });
  let built = false;
  head.addEventListener('click', () => {
    detail.hidden = !detail.hidden;
    head.setAttribute('aria-expanded', detail.hidden ? 'false' : 'true');
    if (!built) { buildDetail(detail, item, { onEdit, onChanged, onRepeat }); built = true; }
  });
  return el('article', { class: 'row' }, [head, detail]);
}

function buildDetail(host, item, { onEdit, onChanged, onRepeat }) {
  const facts = el('dl', { class: 'facts' });
  const add = (k, v) => { if (v == null || v === '') return; facts.appendChild(el('dt', { text: k })); facts.appendChild(el('dd', { text: String(v) })); };
  add('Started work', item.clockIn); add('Stopped work', item.clockOut);
  if (item.meal?.start || item.meal?.end) add('Lunch', `${item.meal.start || '—'} → ${item.meal.end || '—'}`);
  if (item.meal?.waived) add('Mutual first-meal waiver reported', 'Yes');
  if (item.meal?.interruptedBy) add('Bothered by', item.meal.interruptedBy);
  if (item.meal?.onCall) add('Stayed reachable at lunch', 'Yes');
  if (item.meal?.detail) add('What happened', item.meal.detail);
  if (item.meal2?.start || item.meal2?.end) add('Second lunch', `${item.meal2.start || '—'} → ${item.meal2.end || '—'}`);
  if (item.meal2?.waived) add('Mutual second-meal waiver reported', 'Yes');
  if (item.rest?.taken != null) add('Rest breaks taken', item.rest.taken);
  if (item.offClock?.start || item.offClock?.end) add('Unpaid work', `${item.offClock.start || '—'} → ${item.offClock.end || '—'}`);
  if (item.offClock?.task) add('What you did', item.offClock.task);
  if (item.offClock?.directedBy) add('Who told you to', item.offClock.directedBy);
  if (item.offClock?.employerEdited === true) add('They changed the time record', 'Yes');
  if (item.notice?.to) add('Told', `${item.notice.to} (${item.notice.channel || '—'})`);
  if (item.notice?.response) add('They said', item.notice.response);
  if (item.notice?.adverseAction) add('After I spoke up', item.notice.adverseAction);
  if (item.finalPay?.separation) add('How the job ended', { fired: 'Fired or laid off', quit_notice: 'Quit with at least 72 hours’ notice', quit_no_notice: 'Quit with less than 72 hours’ notice' }[item.finalPay.separation] || item.finalPay.separation);
  if (item.finalPay?.lastDay) add('Last day worked', formatDate(item.finalPay.lastDay));
  if (item.finalPay?.datePaid) add('Final pay arrived', formatDate(item.finalPay.datePaid));
  if (item.finalPay && item.finalPay.fullyPaid != null) add('Final check included expected wages', item.finalPay.fullyPaid ? 'Yes' : 'No');
  const split = item.splitShift || {};
  if (split.firstStart || split.firstEnd) add('First work period', `${split.firstStart || '—'} → ${split.firstEnd || '—'}`);
  if (split.secondStart || split.secondEnd) add('Second work period', `${split.secondStart || '—'} → ${split.secondEnd || '—'}`);
  if (split.employerSet != null) add('Employer set the unpaid gap', split.employerSet ? 'Yes' : 'No');
  if (split.livesAtWork != null) add('Lived at the workplace', split.livesAtWork ? 'Yes' : 'No');
  if (split.premiumPaid != null) add('Extra split-shift pay shown', split.premiumPaid ? 'Yes' : 'No');
  const stub = item.payStub || {};
  if (stub.periodStart || stub.periodEnd) add('Pay-stub period', `${stub.periodStart || '—'} → ${stub.periodEnd || '—'}`);
  if (stub.issues?.length) add('Pay-stub concerns', stub.issues.map(payStubIssueLabel).join('; '));
  if (stub.detail) add('Pay-stub detail', stub.detail);
  if (stub.requestedOn) add('Pay-stub copy requested', formatDate(stub.requestedOn));
  if (stub.receivedOn) add('Pay-stub copy received', formatDate(stub.receivedOn));
  const tips = item.tips || {};
  if (tips.problem) add('Tip issue', tipProblemLabel(tips.problem));
  if (tips.date) add('Tip-event date', formatDate(tips.date));
  if (tips.amount) add('Tip amount recorded', tips.amount);
  if (tips.by) add('Tips handled by', tips.by);
  if (tips.askedOn) add('Asked about tips', formatDate(tips.askedOn));
  if (tips.response) add('Tip response', tips.response);
  const sick = item.sickLeave || {};
  if (sick.requestDate) add('Paid sick leave requested', formatDate(sick.requestDate));
  if (sick.actionDate) add('Employer-action date', formatDate(sick.actionDate));
  if (sick.action) add('Action after request', sickActionLabel(sick.action));
  if (sick.available != null) add('Accrued sick time available', sick.available ? 'Yes' : 'No');
  if (sick.told) add('Sick leave request made to', sick.told);
  if (sick.channel) add('How sick leave was requested', sick.channel);
  if (sick.response) add('Sick leave response', sick.response);
  if (item.witnesses) add('Who saw it', item.witnesses);
  if ((item.attachments || []).length) add('Photos saved', `${item.attachments.length} photo(s)`);
  add('Saved at', new Date(item.createdAt).toLocaleString());
  host.appendChild(facts);

  // The tamper-evidence payoff, and the one moment in the app worth a beat. Verification is
  // real async work (SHA-256 over the record and every photo), so there IS a pause — it used
  // to end in a bare text swap that popped. Now the result settles in: the glyphs come from
  // the app's own icon set rather than Unicode look-alikes, and the state carries a class the
  // stylesheet can resolve. Still a quiet stamp, not a wax seal (see DESIGN.md).
  const sealText = el('span', { class: 'seal-text', text: 'Checking record fingerprint…' });
  const seal = el('div', { class: 'seal', role: 'status', 'aria-live': 'polite' }, [sealText]);
  host.appendChild(seal);
  const settle = (cls, iconName, text) => {
    seal.className = `seal ${cls}`;
    sealText.textContent = text;
    if (iconName) {
      const mark = iconEl(iconName);
      mark.setAttribute('aria-hidden', 'true');
      seal.insertBefore(el('span', { class: 'seal-mark' }, [mark]), sealText);
    }
    // Next frame, so the transition has a from-state to run from.
    setTimeout(() => seal.classList.add('settled'), 20);
  };
  verifyIntegrity(item).then(v => {
    if (!v.sealed) settle('none', null, 'Not sealed (older record)');
    else if (v.ok) settle('ok', 'check', 'Fingerprint verified — unchanged since saved');
    else settle('warn', 'triangle-alert', 'This record may have been changed outside the app');
  }).catch(() => seal.remove());

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
    host.appendChild(el('div', { class: 'thumbs' }, item.attachments.map(a => el('img', { class: 'thumb-img', src: attachmentUrl(a), alt: a.name, loading: 'lazy', decoding: 'async' }))));
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
    el('button', { class: 'btn', text: 'Log again', onclick: () => onRepeat?.(item) }),
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
