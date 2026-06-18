// exportJson.js — full-fidelity JSON backup (includes photos as data URLs). One concern: JSON export.
import { blobToDataUrl } from '../capture/media.js';
import { downloadText, dateStamp } from './download.js';
import { manifestHash, HASH_ALGO } from '../domain/integrity.js';

async function serializeAttachments(atts = []) {
  const out = [];
  for (const a of atts) {
    out.push({
      id: a.id, name: a.name, type: a.type, size: a.size, addedAt: a.addedAt,
      sha256: a.sha256 || '', // file fingerprint — kept so the export stays independently verifiable
      dataUrl: a.dataUrl || (a.blob ? await blobToDataUrl(a.blob) : ''),
    });
  }
  return out;
}

// Build the complete, re-importable backup as a JSON string (no download/side effects),
// so it can be downloaded OR shared/emailed. The canonical "don't lose the evidence" file.
export async function buildBackupPayload(incidents, settings) {
  const records = [];
  for (const i of incidents) {
    records.push({ ...i, attachments: await serializeAttachments(i.attachments) });
  }
  const payload = {
    app: 'JobWarden',
    schema: 2,
    jurisdiction: 'California',
    exportedAt: new Date().toISOString(),
    employer: settings?.employer || '',
    employee: settings?.employeeName || '',
    note: 'Contemporaneous self-kept records. Times are local to capturedTz on each record.',
    integrity: {
      algorithm: HASH_ALGO,
      manifestHash: await manifestHash(incidents),
      note: 'Each record carries contentHash + recordHash; each photo carries sha256 of its file. A changed record will not match its fingerprint. This is a self-kept fingerprint, not a third-party timestamp.',
    },
    records,
  };
  return { text: JSON.stringify(payload, null, 2), count: records.length, filename: `jobwarden-backup-${dateStamp()}.json` };
}

export async function exportJson(incidents, settings) {
  const { text, count, filename } = await buildBackupPayload(incidents, settings);
  downloadText(filename, text, 'application/json');
  return count;
}
