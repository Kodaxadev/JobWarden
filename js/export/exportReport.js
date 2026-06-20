// exportReport.js — printable report (Save as PDF). One concern: building the human-readable report.
import { blobToDataUrl } from '../capture/media.js';
import { labelFor } from '../config/infractionTypes.js';
import { formatDate } from '../domain/timeUtils.js';
import { formatLoc } from '../capture/geo.js';
import { verifyIntegrity, manifestHash, HASH_ALGO } from '../domain/integrity.js';
import { BRAND_CSS, docHead } from './reportBrand.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const when = iso => { try { return new Date(iso).toLocaleString(); } catch { return iso || '—'; } };

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
  figure.shot{display:inline-block;margin:6px 6px 0 0;vertical-align:top}
  figure.shot img{max-width:240px;max-height:240px;border:1px solid #ccc;display:block}
  figcaption{font:10px/1.3 ui-monospace,Menlo,Consolas,monospace;color:#666;max-width:240px;word-break:break-all;margin-top:2px}
  .attest{margin:10px 0 0;padding:8px 10px;background:#f3f6f3;border:1px solid #cfe0cf;border-radius:6px;font-size:11px;color:#333}
  .attest code{font:10px/1.3 ui-monospace,Menlo,Consolas,monospace;word-break:break-all}
  .attest .imm{color:#070}
  .mismatch{color:#a10000;font-weight:700;margin-top:4px}
  .unsealed{color:#777;font-style:italic}
  .hist{margin:8px 0 0;font-size:11px;color:#444} .hist ul{margin:4px 0 0;padding-left:18px}
  .integrity{margin:0 0 18px;padding:10px 12px;background:#f3f6f3;border:1px solid #cfe0cf;border-radius:6px;font-size:11px;color:#333}
  .integrity code{font:10px/1.3 ui-monospace,Menlo,Consolas,monospace;word-break:break-all}
  .integrity p{margin:6px 0 0;color:#555}
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
  if (i.meal?.onCall) add('On-call during lunch', 'Yes — had to stay reachable');
  if (i.meal?.detail) add('Detail', i.meal.detail);
  if (i.meal?.relievedOfDuty != null) add('Relieved of duty', i.meal.relievedOfDuty ? 'Yes' : 'No');
  if (i.meal?.writtenAgreement === 'yes') add('Written on-duty meal agreement', 'Employee response: Yes');
  if (i.meal?.writtenAgreement === 'no') add('Written on-duty meal agreement', 'Employee response: No');
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
  if (i.classification?.awsElection === 'yes') add('Alternative workweek', 'Yes — daily OT after 8h may not apply');
  if (i.classification?.cbaCovered === 'yes') add('Union contract (CBA)', 'Yes — break rules may differ');
  if (i.finalPay?.separation) add('How the job ended', { fired: 'Fired or laid off', quit_notice: 'Quit with 3+ days notice', quit_no_notice: 'Quit without notice' }[i.finalPay.separation] || i.finalPay.separation);
  if (i.finalPay?.lastDay) add('Last day worked', formatDate(i.finalPay.lastDay));
  if (i.finalPay?.datePaid) add('Final pay arrived', formatDate(i.finalPay.datePaid));
  if (i.finalPay && i.finalPay.fullyPaid != null) add('Paid everything owed', i.finalPay.fullyPaid ? 'Yes' : 'No');
  if (i.notice?.to) add('Reported to', `${i.notice.to} (${i.notice.channel || '—'})`);
  if (i.notice?.response) add('Their response', i.notice.response);
  if (i.notice?.adverseAction) add('What happened after I spoke up', i.notice.adverseAction);
  if (i.witnesses) add('Witnesses', i.witnesses);
  const hrs = (i.flags || []).find(f => f.key === 'hoursWorked');
  if (hrs) add('Hours worked (computed)', hrs.value);
  if (i.location) add('Location', formatLoc(i.location));
  add('Recorded at', new Date(i.createdAt).toLocaleString());

  const notes = (i.flags || []).filter(f => f.note).map(f => `<li>${esc(f.note)}</li>`).join('');
  let imgs = '';
  for (const a of (i.attachments || [])) {
    const url = a.dataUrl || (a.blob ? await blobToDataUrl(a.blob) : '');
    if (!url) continue;
    const cap = a.sha256 ? `${esc(a.name || 'photo')} · ${HASH_ALGO}: ${a.sha256}` : esc(a.name || 'photo');
    imgs += `<figure class="shot"><img src="${url}" alt="${esc(a.name)}"><figcaption>${cap}</figcaption></figure>`;
  }

  const v = await verifyIntegrity(i);
  const edits = i.editLog || [];
  const editLine = edits.length
    ? `Edited ${edits.length} time(s) after creation — see history below.`
    : 'Not edited since creation.';
  const fp = v.sealed
    ? `<div><strong>Record fingerprint (${HASH_ALGO}):</strong> <code>${i.recordHash}</code></div>`
    : '<div class="unsealed">Created before fingerprint sealing was added.</div>';
  const mismatch = (v.sealed && !v.ok)
    ? '<div class="mismatch">⚠ Fingerprint does not match this record’s contents — it may have been changed outside the app.</div>'
    : '';
  const histHtml = edits.length ? `<div class="hist"><strong>Edit history</strong><ul>${
    edits.map(h => {
      const ch = (h.changes || []).map(c => `${esc(c.field)}: ${esc(c.from ?? '')} → ${esc(c.to ?? '')}`).join('; ');
      return `<li>${esc(when(h.at))} — ${esc(h.note || 'edited')}${ch ? ` (${ch})` : ''}</li>`;
    }).join('')
  }</ul></div>` : '';

  return `<div class="rec">
    <h2>${esc(formatDate(i.incidentDate))}</h2>
    <div class="tags">${tags}</div>
    <dl>${rows.join('')}</dl>
    ${notes ? `<ul class="notes">${notes}</ul>` : ''}
    ${i.narrative ? `<div class="narr">${esc(i.narrative)}</div>` : ''}
    ${imgs ? `<div class="imgs">${imgs}</div>` : ''}
    <div class="attest">
      <div><strong>Created:</strong> ${esc(when(i.createdAt))} <span class="imm">(immutable)</span></div>
      <div><strong>Edits:</strong> ${editLine}</div>
      ${fp}${mismatch}
    </div>
    ${histHtml}
  </div>`;
}

export async function buildReportHtml(incidents, settings = {}) {
  const blocks = [];
  for (const i of incidents) blocks.push(await recordHtml(i));
  const mh = await manifestHash(incidents);
  const title = 'Workplace Meal/Rest & Wage Log — California';
  const who = [settings.employeeName && `Employee: ${esc(settings.employeeName)}`,
    settings.employer && `Employer: ${esc(settings.employer)}`].filter(Boolean).join(' · ');
  const integrity = mh ? `<div class="integrity">
      <div><strong>Report integrity</strong> — Algorithm: ${HASH_ALGO} · Records: ${incidents.length} · Generated: ${esc(new Date().toLocaleString())}</div>
      <div><strong>Set fingerprint:</strong> <code>${mh}</code></div>
      <p>Each record below carries a fingerprint of its contents and edit history, and each photo carries a fingerprint of its file. These let anyone detect whether a record was changed after it was saved. This is a self-kept log, not a third-party timestamp — the fingerprints do not prove the times entered are true.</p>
    </div>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>${STYLE}${BRAND_CSS}</style></head><body>
    ${docHead()}
    <h1>${esc(title)}</h1>
    <p class="sub">${who}${who ? ' · ' : ''}Generated ${new Date().toLocaleString()} · ${incidents.length} record(s)</p>
    ${integrity}
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
