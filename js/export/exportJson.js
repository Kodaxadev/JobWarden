// exportJson.js — full-fidelity JSON backup (includes photos as data URLs). One concern: JSON export.
import { blobToDataUrl } from '../capture/media.js';
import { downloadText, dateStamp } from './download.js';

async function serializeAttachments(atts = []) {
  const out = [];
  for (const a of atts) {
    out.push({
      id: a.id, name: a.name, type: a.type, size: a.size, addedAt: a.addedAt,
      dataUrl: a.dataUrl || (a.blob ? await blobToDataUrl(a.blob) : ''),
    });
  }
  return out;
}

// Produces a complete, re-importable backup. This is the canonical "don't lose the evidence" file.
export async function exportJson(incidents, settings) {
  const records = [];
  for (const i of incidents) {
    records.push({ ...i, attachments: await serializeAttachments(i.attachments) });
  }
  const payload = {
    app: 'JobWarden',
    schema: 1,
    jurisdiction: 'California',
    exportedAt: new Date().toISOString(),
    employer: settings?.employer || '',
    employee: settings?.employeeName || '',
    note: 'Contemporaneous self-kept records. Times are local to capturedTz on each record.',
    records,
  };
  downloadText(`jobwarden-backup-${dateStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  return records.length;
}
