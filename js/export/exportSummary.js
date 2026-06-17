// exportSummary.js — one-page "pattern summary" (Save as PDF). One concern: the at-a-glance
// overview + chronological timeline for a lawyer or the Labor Commissioner. Facts and counts
// only — no dollar amounts, no verdict (same ethos as exportReport).
import { summarizePatterns, buildTimeline } from '../domain/patterns.js';
import { manifestHash, HASH_ALGO } from '../domain/integrity.js';
import { formatDate } from '../domain/timeUtils.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STYLE = `
  *{box-sizing:border-box} body{font:13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:32px;}
  h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;margin:18px 0 8px}
  .sub{color:#555;margin:0 0 14px;font-size:12px}
  .integrity{margin:0 0 16px;padding:9px 12px;background:#f3f6f3;border:1px solid #cfe0cf;border-radius:6px;font-size:11px;color:#444}
  .integrity code{font:10px/1.3 ui-monospace,Menlo,Consolas,monospace;word-break:break-all}
  .meta{font-size:12px;color:#333;margin:0 0 6px}
  ul.totals{margin:6px 0 0;padding-left:18px} ul.totals li{margin:3px 0}
  ul.totals b{font-size:14px}
  table{border-collapse:collapse;width:100%;font-size:11.5px;margin-top:6px}
  th,td{border:1px solid #ccc;padding:5px 7px;text-align:left;vertical-align:top}
  th{background:#f2f2f2} td.f{color:#1a5}
  tr{page-break-inside:avoid}
  .foot{margin-top:22px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:10px}
  .sign{margin-top:26px} .sign .line{border-top:1px solid #000;width:280px;margin-top:30px;padding-top:4px;font-size:11px}
  @media print{body{margin:12mm}}
`;

export async function buildSummaryHtml(incidents, settings = {}) {
  const s = summarizePatterns(incidents);
  const timeline = buildTimeline(incidents);
  const mh = await manifestHash(incidents);
  const title = 'Pattern Summary — Workplace Meal/Rest & Wage Log (California)';
  const who = [settings.employeeName && `Employee: ${esc(settings.employeeName)}`,
    settings.employer && `Employer: ${esc(settings.employer)}`].filter(Boolean).join(' · ');
  const range = s.range.from ? `${esc(formatDate(s.range.from))} – ${esc(formatDate(s.range.to))} (${esc(s.range.span)})` : '';

  const totals = [
    ...s.headline.map(h => `<li><b>${h.count}</b> ${esc(h.label)}</li>`),
    s.offClock.records ? `<li><b>${s.offClock.totalMinutes} min</b> off-the-clock work, across ${s.offClock.records} shift(s)</li>` : '',
  ].filter(Boolean).join('');

  const places = s.byWorkplace.length > 1
    ? `<p class="meta">By location: ${s.byWorkplace.map(w => `${esc(w.name)} (${w.count})`).join(' · ')}</p>` : '';

  const rows = timeline.map(t => `<tr>
      <td>${esc(t.dateLabel)}</td>
      <td>${esc(t.workplace || '—')}</td>
      <td>${esc(t.types.join(', '))}</td>
      <td class="f">${esc(t.findings.join('; '))}</td>
    </tr>`).join('');

  const integrity = mh ? `<div class="integrity"><strong>Integrity:</strong> ${HASH_ALGO} · Set fingerprint <code>${mh}</code> — detects any change to the underlying records. A self-kept log, not a third-party timestamp.</div>` : '';

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>${STYLE}</style></head><body>
    <h1>${esc(title)}</h1>
    <p class="sub">${who}${who ? ' · ' : ''}${range ? range + ' · ' : ''}Generated ${esc(new Date().toLocaleString())}</p>
    ${integrity}
    <p class="meta">${s.count} shift(s) logged · ${s.issueRecords} with a possible issue · ${s.reportedCount} reported · ${s.withProofCount} with photo proof.</p>
    ${places}
    <h2>Totals (counts only — no dollar amounts)</h2>
    ${totals ? `<ul class="totals">${totals}</ul>` : '<p class="meta">No possible issues flagged.</p>'}
    <h2>Timeline</h2>
    <table>
      <thead><tr><th>Date</th><th>Place</th><th>What was logged</th><th>Possible issue</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="sign">
      <p style="font-size:11px;color:#444">These are my own records, made at or near the time of each event to the best of my knowledge.</p>
      <div class="line">Signature / Date</div>
    </div>
    <div class="foot">Self-kept contemporaneous log. Not legal advice. Counts and timing only; premium-pay dollar amounts are intentionally not computed. Confirm any classification and strategy with an employment attorney or the California Labor Commissioner.</div>
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
