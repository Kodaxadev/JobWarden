// download.js — trigger file downloads. One concern: saving generated files to disk.
import { todayDateStr } from '../domain/timeUtils.js';

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadText(filename, text, mime = 'text/plain') {
  downloadBlob(filename, new Blob([text], { type: `${mime};charset=utf-8` }));
}

// The date on every export filename and in the email subject line. It has to be the LOCAL date:
// `toISOString().slice(0,10)` is the UTC date, so in California every backup saved after about
// 4pm was stamped tomorrow — and "which backup is the newest" is read off these filenames.
export function dateStamp() {
  return todayDateStr();
}
