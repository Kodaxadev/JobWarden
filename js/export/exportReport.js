// exportReport.js — printable report (Save as PDF). One concern: building the human-readable report.
import { blobToDataUrl } from '../capture/media.js';
import { labelFor } from '../config/infractionTypes.js';
import { jurisdictionLabel } from '../config/jurisdictions.js';
import { formatDate } from '../domain/timeUtils.js';
import { formatLoc } from '../capture/geo.js';
import { verifyIntegrity, manifestHash, HASH_ALGO } from '../domain/integrity.js';
import { PAPER_CSS, BRAND_CSS, REPORT_CSP, docHead } from './reportBrand.js';
import { DOCUMENT_PREAMBLE, DOCUMENT_FOOTER, WHAT_THE_SEAL_MEANS } from '../config/disclaimers.js';
import { payStatusLabel } from '../config/payStatus.js';
import { payStubIssueLabel, tipProblemLabel, sickActionLabel } from '../config/payIssueOptions.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const when = iso => { try { return new Date(iso).toLocaleString(); } catch { return iso || '—'; } };

// Report-specific layout only — the paper palette + shared document chrome live in
// reportBrand.js (PAPER_CSS), so both printable documents stay one product.
const STYLE = `
  .rec{border:1px solid var(--paper-line);border-radius:8px;padding:14px 16px;margin:0 0 14px;page-break-inside:avoid}
  .rec h2{font-size:15px;margin:0 0 6px} .tags{margin:0 0 8px}
  .tag{display:inline-block;background:var(--paper-navy-tint);border:1px solid var(--paper-navy-line);border-radius:10px;padding:1px 8px;font-size:11px;margin:2px 4px 2px 0;color:var(--paper-navy)}
  dl{display:grid;grid-template-columns:140px 1fr;gap:2px 10px;margin:6px 0}
  dt{color:var(--paper-muted)} dd{margin:0}
  ul.notes{margin:8px 0;padding-left:18px} ul.notes li{color:var(--paper-green)}
  .narr{white-space:pre-wrap;background:var(--paper-well);border:1px solid var(--paper-line);border-radius:6px;padding:8px 10px;margin:8px 0}
  figure.shot{display:inline-block;margin:6px 6px 0 0;vertical-align:top}
  figure.shot img{max-width:240px;max-height:240px;border:1px solid var(--paper-line);display:block}
  figcaption{font:10px/1.3 ui-monospace,Menlo,Consolas,monospace;color:var(--paper-muted);max-width:240px;word-break:break-all;margin-top:2px}
  .attest{margin:10px 0 0;padding:8px 10px;background:var(--paper-navy-tint);border:1px solid var(--paper-navy-line);border-radius:6px;font-size:11px;color:var(--paper-ink-2)}
  .attest .imm{color:var(--paper-navy)}
  .mismatch{color:var(--paper-red);font-weight:700;margin-top:4px}
  .unsealed{color:var(--paper-faint);font-style:italic}
  .hist{margin:8px 0 0;font-size:11px;color:var(--paper-ink-2)} .hist ul{margin:4px 0 0;padding-left:18px}
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
  if (i.meal?.waived) add('Mutual first-meal waiver reported', 'Yes');
  if (i.meal2?.start || i.meal2?.end) add('Second meal', `${i.meal2.start || '—'} → ${i.meal2.end || '—'}`);
  if (i.meal2?.waived) add('Mutual second-meal waiver reported', 'Yes');
  if (i.rest?.taken != null) add('Rest breaks taken', i.rest.taken);
  if (i.offClock?.start || i.offClock?.end) add('Off-clock work', `${i.offClock.start || '—'} → ${i.offClock.end || '—'}`);
  if (i.offClock?.task) add('Off-clock task', i.offClock.task);
  if (i.offClock?.directedBy) add('Directed by', i.offClock.directedBy);
  if (i.offClock?.employerEdited === true) add('Time record edited by employer', 'Yes');
  if (i.offClock?.payPeriod) add('Pay period', i.offClock.payPeriod);
  if (i.classification?.payType) add('Pay and exemption status', payStatusLabel(i.classification.payType));
  if (i.classification?.awsElection === 'yes') add('Alternative workweek', 'Yes — daily OT after 8h may not apply');
  if (i.classification?.cbaCovered === 'yes') add('Union contract (CBA)', 'Yes — break rules may differ');
  if (i.finalPay?.separation) add('How the job ended', { fired: 'Fired or laid off', quit_notice: 'Quit with at least 72 hours’ notice', quit_no_notice: 'Quit with less than 72 hours’ notice' }[i.finalPay.separation] || i.finalPay.separation);
  if (i.finalPay?.lastDay) add('Last day worked', formatDate(i.finalPay.lastDay));
  if (i.finalPay?.datePaid) add('Final pay arrived', formatDate(i.finalPay.datePaid));
  if (i.finalPay && i.finalPay.fullyPaid != null) add('Final check included expected wages', i.finalPay.fullyPaid ? 'Yes' : 'No');
  if (i.schedule?.scheduledStart || i.schedule?.scheduledEnd) add('Scheduled shift', `${i.schedule.scheduledStart || '—'}  →  ${i.schedule.scheduledEnd || '—'}`);
  if (i.schedule?.sentHomeBy) add('Sent home by', i.schedule.sentHomeBy);
  if (i.schedule?.reason) add('Reason given for sending home', i.schedule.reason);
  if (i.expense?.item) add('Paid for (work expense)', `${i.expense.item}${i.expense.amount ? ` — ${i.expense.amount}` : ''}`);
  if (i.expense?.paidOn) add('Expense paid on', formatDate(i.expense.paidOn));
  if (i.expense && i.expense.reimbursed != null) add('Reimbursed', i.expense.reimbursed ? 'Yes' : 'No');
  if (i.expense?.askedOn) add('Asked to be reimbursed', formatDate(i.expense.askedOn));
  if (i.expense?.response) add('Their answer', i.expense.response);
  const split = i.splitShift || {};
  if (split.firstStart || split.firstEnd) add('First work period', `${split.firstStart || '—'} → ${split.firstEnd || '—'}`);
  if (split.secondStart || split.secondEnd) add('Second work period', `${split.secondStart || '—'} → ${split.secondEnd || '—'}`);
  if (split.employerSet != null) add('Employer set unpaid gap', split.employerSet ? 'Yes' : 'No');
  if (split.livesAtWork != null) add('Lived at workplace', split.livesAtWork ? 'Yes' : 'No');
  if (split.premiumPaid != null) add('Extra split-shift pay shown', split.premiumPaid ? 'Yes' : 'No');
  const stub = i.payStub || {};
  if (stub.periodStart || stub.periodEnd) add('Pay-stub period', `${stub.periodStart || '—'} → ${stub.periodEnd || '—'}`);
  if (stub.issues?.length) add('Pay-stub concerns', stub.issues.map(payStubIssueLabel).join('; '));
  if (stub.detail) add('Pay-stub detail', stub.detail);
  if (stub.requestedOn) add('Pay-stub copy requested', formatDate(stub.requestedOn));
  if (stub.receivedOn) add('Pay-stub copy received', formatDate(stub.receivedOn));
  const tips = i.tips || {};
  if (tips.problem) add('Tip issue', tipProblemLabel(tips.problem));
  if (tips.date) add('Tip-event date', formatDate(tips.date));
  if (tips.amount) add('Tip amount recorded', tips.amount);
  if (tips.by) add('Tips handled by', tips.by);
  if (tips.askedOn) add('Asked about tips', formatDate(tips.askedOn));
  if (tips.response) add('Tip response', tips.response);
  const sick = i.sickLeave || {};
  if (sick.requestDate) add('Paid sick leave requested', formatDate(sick.requestDate));
  if (sick.actionDate) add('Employer-action date', formatDate(sick.actionDate));
  if (sick.action) add('Action after request', sickActionLabel(sick.action));
  if (sick.available != null) add('Accrued sick time available', sick.available ? 'Yes' : 'No');
  if (sick.told) add('Sick leave request made to', sick.told);
  if (sick.channel) add('How sick leave was requested', sick.channel);
  if (sick.response) add('Sick leave response', sick.response);
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
    // Only inline image data URLs — a restored backup file is untrusted input, and this
    // HTML is written into a same-origin window (see importBackup): no other schemes.
    if (!/^data:image\//.test(url)) continue;
    const cap = a.sha256 ? `${esc(a.name || 'photo')} · ${HASH_ALGO}: ${esc(a.sha256)}` : esc(a.name || 'photo');
    imgs += `<figure class="shot"><img src="${esc(url)}" alt="${esc(a.name)}"><figcaption>${cap}</figcaption></figure>`;
  }

  const v = await verifyIntegrity(i);
  const edits = i.editLog || [];
  const editLine = edits.length
    ? `Edited ${edits.length} time(s) after creation — see history below.`
    : 'Not edited since creation.';
  const fp = v.sealed
    ? `<div><strong>Record fingerprint (${HASH_ALGO}):</strong> <code>${esc(i.recordHash)}</code></div>`
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
  const title = `Workplace Meal/Rest & Wage Log — ${jurisdictionLabel(settings.jurisdiction)}`;
  const who = [settings.employeeName && `Employee: ${esc(settings.employeeName)}`,
    settings.employer && `Employer: ${esc(settings.employer)}`].filter(Boolean).join(' · ');
  const integrity = mh ? `<div class="integrity">
      <div><strong>Report integrity</strong> — Algorithm: ${HASH_ALGO} · Records: ${incidents.length} · Generated: ${esc(new Date().toLocaleString())}</div>
      <div><strong>Set fingerprint:</strong> <code>${esc(mh)}</code></div>
      <p>Each record below carries a fingerprint of its contents and edit history, and each photo carries a fingerprint of its file. ${esc(WHAT_THE_SEAL_MEANS)}</p>
    </div>` : '';
  // Leads the document, above the records: whoever picks this up learns whose account it is
  // and what has NOT been established before they read a single entry.
  const preamble = `<div class="preamble">
      <h2>${esc(DOCUMENT_PREAMBLE.title)}</h2>
      ${DOCUMENT_PREAMBLE.paras.map(p => `<p>${esc(p)}</p>`).join('')}
    </div>`;
  return `<!doctype html><html><head><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="${REPORT_CSP}"><title>${esc(title)}</title>
    <style>${PAPER_CSS}${BRAND_CSS}${STYLE}</style></head><body>
    ${docHead()}
    <h1>${esc(title)}</h1>
    <p class="sub">${who}${who ? ' · ' : ''}Generated ${new Date().toLocaleString()} · ${incidents.length} record(s)</p>
    ${preamble}
    ${integrity}
    ${blocks.join('')}
    <div class="sign">
      <p>These are my own records of my own working conditions, written by me at or near the time of each event, to the best of my knowledge and recollection.</p>
      <div class="line">Signature / Date</div>
    </div>
    <div class="foot">${esc(DOCUMENT_FOOTER)}</div>
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
