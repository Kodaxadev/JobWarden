// exportSummary.js — one-page "pattern summary" (Save as PDF). One concern: the at-a-glance
// overview + chronological timeline for a lawyer or the Labor Commissioner. Facts and counts
// only — no dollar amounts, no verdict (same ethos as exportReport).
import { summarizePatterns, buildTimeline } from '../domain/patterns.js';
import { manifestHash, HASH_ALGO } from '../domain/integrity.js';
import { jurisdictionLabel } from '../config/jurisdictions.js';
import { formatDate } from '../domain/timeUtils.js';
import { PAPER_CSS, BRAND_CSS, REPORT_CSP, docHead } from './reportBrand.js';
import { DOCUMENT_PREAMBLE, DOCUMENT_FOOTER, WHAT_THE_SEAL_MEANS } from '../config/disclaimers.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Summary-specific layout only — the paper palette + shared document chrome live in
// reportBrand.js (PAPER_CSS), so both printable documents stay one product.
const STYLE = `
  h2{font-size:14px;margin:18px 0 8px}
  .meta{font-size:12px;color:var(--paper-ink-2);margin:0 0 6px}
  ul.totals{margin:6px 0 0;padding-left:18px} ul.totals li{margin:3px 0}
  ul.totals b{font-size:14px}
  table{border-collapse:collapse;width:100%;font-size:11.5px;margin-top:6px}
  /* A workplace name is unbounded user input and table-layout:auto sizes a column to its
     longest unbreakable run, so one long name pushes the table past its 100% width and off the
     page. Letting cells break keeps the table inside the paper. */
  th,td{border:1px solid var(--paper-line);padding:5px 7px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
  th{background:var(--paper-navy-tint);color:var(--paper-navy)} td.f{color:var(--paper-gold-deep)}
  tr{page-break-inside:avoid}
`;

export async function buildSummaryHtml(incidents, settings = {}) {
  const s = summarizePatterns(incidents);
  const timeline = buildTimeline(incidents);
  const mh = await manifestHash(incidents);
  const title = `Pattern Summary — Workplace Meal/Rest & Wage Log (${jurisdictionLabel(settings.jurisdiction)})`;
  const who = [settings.employeeName && `Employee: ${esc(settings.employeeName)}`,
    settings.employer && `Employer: ${esc(settings.employer)}`].filter(Boolean).join(' · ');
  const range = s.range.from ? `${esc(formatDate(s.range.from))} – ${esc(formatDate(s.range.to))} (${esc(s.range.span)})` : '';

  const ot = s.weeklyOvertime;
  const totals = [
    ...s.headline.map(h => `<li><b>${h.count}</b> ${esc(h.label)}</li>`),
    s.offClock.records ? `<li><b>${s.offClock.totalMinutes} min</b> off-the-clock work, across ${s.offClock.records} shift(s)</li>` : '',
    ot && ot.count ? `<li><b>${ot.count} week(s)</b> over 40 hours worked (${ot.totalOtHours}h total over 40, Sun–Sat basis) — possible weekly overtime</li>` : '',
  ].filter(Boolean).join('');

  const places = s.byWorkplace.length > 1
    ? `<p class="meta">By location: ${s.byWorkplace.map(w => `${esc(w.name)} (${w.count})`).join(' · ')}</p>` : '';
  const interrupters = s.interruptions.total > 0 && s.interruptions.byActor.length
    ? `<p class="meta">Lunch interrupted ${s.interruptions.total} time(s) — by: ${s.interruptions.byActor.map(a => `${esc(a.actor)} (${a.count})`).join(' · ')}</p>` : '';

  const rows = timeline.map(t => `<tr>
      <td>${esc(t.dateLabel)}</td>
      <td>${esc(t.workplace || '—')}</td>
      <td>${esc(t.types.join(', '))}</td>
      <td class="f">${esc(t.findings.join('; '))}</td>
    </tr>`).join('');

  const integrity = mh ? `<div class="integrity"><strong>Integrity:</strong> ${HASH_ALGO} · Set fingerprint <code>${esc(mh)}</code> — detects any change to the underlying records. ${esc(WHAT_THE_SEAL_MEANS)}</div>` : '';
  const preamble = `<div class="preamble">
      <h2>${esc(DOCUMENT_PREAMBLE.title)}</h2>
      ${DOCUMENT_PREAMBLE.paras.map(p => `<p>${esc(p)}</p>`).join('')}
    </div>`;

  return `<!doctype html><html><head><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="${REPORT_CSP}"><title>${esc(title)}</title>
    <style>${PAPER_CSS}${BRAND_CSS}${STYLE}</style></head><body>
    ${docHead()}
    <h1>${esc(title)}</h1>
    <p class="sub">${who}${who ? ' · ' : ''}${range ? range + ' · ' : ''}Generated ${esc(new Date().toLocaleString())}</p>
    ${preamble}
    ${integrity}
    <p class="meta">${s.count} shift(s) logged · ${s.issueRecords} with a possible issue · ${s.reportedCount} reported · ${s.withProofCount} with photos attached.</p>
    ${places}
    ${interrupters}
    <h2>Totals (counts only — no dollar amounts)</h2>
    ${totals ? `<ul class="totals">${totals}</ul>` : '<p class="meta">No possible issues flagged.</p>'}
    <h2>Timeline</h2>
    <table>
      <thead><tr><th>Date</th><th>Place</th><th>What was logged</th><th>Possible issue</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="sign">
      <p>These are my own records of my own working conditions, written by me at or near the time of each event, to the best of my knowledge and recollection.</p>
      <div class="line">Signature / Date</div>
    </div>
    <div class="foot">${esc(DOCUMENT_FOOTER)}</div>
    </body></html>`;
}

export async function openPrintSummary(incidents, settings) {
  const html = await buildSummaryHtml(incidents, settings);
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open(); w.document.write(html); w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* user can print manually */ } }, 600);
  return true;
}
