// emailExport.js — "Email to myself": a fast off-device backup. One concern: handing the
// backup file + a readable summary to the device's email app.
//
// mailto: cannot carry attachments, so the file goes via the Web Share API (navigator.share
// with files) — on a phone the share sheet offers Mail/Gmail with the backup attached. Where
// file-sharing is unsupported, fall back to downloading the file + opening mailto with the
// summary pre-filled. (Google Drive export is a later, OAuth-based addition — see Phase 3 plan.)
import { buildBackupPayload } from './exportJson.js';
import { downloadText, dateStamp } from './download.js';
import { summarizePatterns } from '../domain/patterns.js';

// Plain-text summary that reads as a mini report in the email body.
export function emailSummary(incidents, settings = {}) {
  const s = summarizePatterns(incidents);
  const lines = ['JobWarden — my workplace records'];
  if (settings.employeeName) lines.push('Employee: ' + settings.employeeName);
  if (settings.employer) lines.push('Employer: ' + settings.employer);
  if (s.range.from) lines.push('Period: ' + s.range.from + ' to ' + s.range.to + ' (' + s.range.span + ')');
  lines.push(s.count + ' record(s) · ' + s.issueRecords + ' with a possible issue.');
  lines.push('');
  s.headline.forEach(h => lines.push('• ' + h.count + ' ' + h.label));
  if (s.offClock.records) lines.push('• ' + s.offClock.totalMinutes + ' min off-the-clock work');
  lines.push('');
  lines.push('Full records (with photos) are in the attached JobWarden backup file.');
  lines.push('Facts and counts only — not legal advice.');
  return lines.join('\n');
}

// Returns 'shared' | 'cancelled' | 'fallback'. Must be called from a user gesture.
export async function emailRecords(incidents, settings = {}) {
  const { text, count, filename } = await buildBackupPayload(incidents, settings);
  const subject = `JobWarden records — ${dateStamp()} (${count} record${count === 1 ? '' : 's'})`;
  const body = emailSummary(incidents, settings);

  const file = new File([text], filename, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: subject, text: body });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled';
      // otherwise fall through to the mailto fallback
    }
  }

  // Fallback: save the file, then open the mail client with the summary pre-filled.
  downloadText(filename, text, 'application/json');
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n(Attach the backup file that just downloaded.)')}`;
  window.location.href = href;
  return 'fallback';
}
