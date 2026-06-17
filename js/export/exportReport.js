// exportReport.js — printable report (Save as PDF). One concern: building the human-readable report.
import { blobToDataUrl } from '../capture/media.js';
import { labelFor } from '../config/infractionTypes.js';
import { formatDate } from '../domain/timeUtils.js';
import { formatLoc } from '../capture/geo.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STYLE = `
  *{box-sizing:border-box} body{font:13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:32px;}
  h1{font-size:20px;margin:0 0 4px} .sub{color:#555;margin:0 0 18px;font-size:12px}
  .rec{border:1px solid #ccc;border-radius:8px;padding:14px 16px;margin:0 0 14px;page-break-inside:avoid}
  .rec h2{font-size:15px;margin:0 0 6px} .tags{margin:0 0 8px}
  .tag{display:inline-block;background:#eef;border:1px solid #99c;border-radius:10px;padding:1px 8px;font-size:11px;margin:2px 4px 2px 0}
  dl{display:grid;grid-template-columns:140px 1fr;gap:2px 10px;margin:6px 0}
  dt{color:#555} dd{margin:0}
  ul.notes{margin:8px 0;padding-left:18px} ul.notes li{color:#1a5}
  .narr{white-space:pre-wrap;background:#f7f7f7;border-left:3px solid #ccc;padding:8px 10px;margin:8px 0}
  .imgs img{max-width:240px;max-height:240px;border:1px solid #ccc;margin:6px 6px 0 0;vertical-align:top}
  .foot{margin-top:24px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:10px}
  .sign{margin-top:30px} .sign .line{border-top:1px solid #000;width:280px;margin-top:34px;padding-top:4px;font-size:11px}
  @media print{body{margin:12mm}}
`;

async function recordHtml(i) {
  const tags = (i.types || []).map(t => `<span class="tag">${esc(labelFor(t))}</span>`).join('');
  const rows = [];
  const add = (k, v) => { if (v != null && v !== '') rows.push(`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`); };
  add('Workplace', i.workplace);
  add('Clock in / out', `${i.clockIn || '—'}  →  ${i.clockOut || '—'}`);
  if (i.meal?.start || i.meal?.end) add('Lunch', `${i.meal.start || '—'} → ${i.meal.end || '—'}`);
  if (i.meal?.interrupted) add('Interrupted by', i.meal.interruptedBy || 'yes');
  if (i.meal?.detail) add('Detail', i.meal.detail);
  if (i.meal?.relievedOfDuty != null) add('Relieved of duty', i.meal.relievedOfDuty ? 'Yes' : 'No');
  if (i.meal?.waived) add('First meal waived', 'Yes');
  if (i.meal2?.start || i.meal2?.end) add('Second meal', `${i.meal2.start || '—'} → ${i.meal2.end || '—'}`);
  if (i.meal2?.waived) add('Second meal waived', 'Yes');
  if (i.rest?.taken != null) add('Rest breaks taken', i.rest.taken);
  if (i.offClock?.start || i.offClock?.end) add('Off-clock work', `${i.offClock.start || '—'} → ${i.offClock.end || '—'}`);
  if (i.offClock?.task) add('Off-clock task', i.offClock.task);
  if (i.offClock?.directedBy) add('Directed by', i.offClock.directedBy);
  if (i.offClock?.employerEdited === true) add('Time record edited by employer', 'Yes');
  if (i.offClock?.payPeriod) add('Pay period', i.offClock.payPeriod);
  if (i.classification?.payType) add('Worker pay type', i.classification.payType);
  if (i.notice?.to) add('Reported to', `${i.notice.to} (${i.notice.channel || '—'})`);
  if (i.notice?.response) add('Their response', i.notice.response);
  if (i.witnesses) add('Witnesses', i.witnesses);
  const hrs = (i.flags || []).find(f => f.key === 'hoursWorked');
  if (hrs) add('Hours worked (computed)', hrs.value);
  if (i.location) add('Location', formatLoc(i.location));
  add('Recorded at', new Date(i.createdAt).toLocaleString());

  const notes = (i.flags || []).filter(f => f.note).map(f => `<li>${esc(f.note)}</li>`).join('');
  let imgs = '';
  for (const a of (i.attachments || [])) {
    const url = a.dataUrl || (a.blob ? await blobToDataUrl(a.blob) : '');
    if (url) imgs += `<img src="${url}" alt="${esc(a.name)}">`;
  }

  return `<div class="rec">
    <h2>${esc(formatDate(i.incidentDate))}</h2>
    <div class="tags">${tags}</div>
    <dl>${rows.join('')}</dl>
    ${notes ? `<ul class="notes">${notes}</ul>` : ''}
    ${i.narrative ? `<div class="narr">${esc(i.narrative)}</div>` : ''}
    ${imgs ? `<div class="imgs">${imgs}</div>` : ''}
    ${(i.editLog || []).length ? `<p style="font-size:11px;color:#666">Edit history: ${(i.editLog || []).length} change-set(s) after creation; original createdAt is immutable.</p>` : ''}
  </div>`;
}

export async function buildReportHtml(incidents, settings = {}) {
  const blocks = [];
  for (const i of incidents) blocks.push(await recordHtml(i));
  const title = 'Workplace Meal/Rest & Wage Log — California';
  const who = [settings.employeeName && `Employee: ${esc(settings.employeeName)}`,
    settings.employer && `Employer: ${esc(settings.employer)}`].filter(Boolean).join(' · ');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>${STYLE}</style></head><body>
    <h1>${esc(title)}</h1>
    <p class="sub">${who}${who ? ' · ' : ''}Generated ${new Date().toLocaleString()} · ${incidents.length} record(s)</p>
    ${blocks.join('')}
    <div class="sign">
      <p style="font-size:11px;color:#444">These are my own records, made at or near the time of each event to the best of my knowledge.</p>
      <div class="line">Signature / Date</div>
    </div>
    <div class="foot">Self-kept contemporaneous log. Not legal advice. Premium-pay dollar amounts are intentionally not computed here.</div>
    </body></html>`;
}

export async function openPrintReport(incidents, settings) {
  const html = await buildReportHtml(incidents, settings);
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open(); w.document.write(html); w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* user can print manually */ } }, 600);
  return true;
}
