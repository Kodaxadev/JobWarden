// exportJson.js — full-fidelity JSON backup (includes photos as data URLs). One concern: JSON export.
import { blobToDataUrl } from '../capture/media.js';
import { downloadBlob, dateStamp } from './download.js';
import { manifestHash, HASH_ALGO } from '../domain/integrity.js';
import { jurisdictionLabel } from '../config/jurisdictions.js';
import { encryptBackup } from './backupCrypto.js';

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

async function backupMeta(incidents, settings) {
  return {
    app: 'JobWarden',
    schema: 2,
    jurisdiction: jurisdictionLabel(settings?.jurisdiction),
    exportedAt: new Date().toISOString(),
    employer: settings?.employer || '',
    employee: settings?.employeeName || '',
    note: 'Contemporaneous self-kept records. Times are local to capturedTz on each record.',
    integrity: {
      algorithm: HASH_ALGO,
      manifestHash: await manifestHash(incidents),
      note: 'Each record carries contentHash + recordHash; each photo carries sha256 of its file. A changed record will not match its fingerprint. This is a self-kept fingerprint, not a third-party timestamp.',
    },
  };
}

// The backup as an ARRAY of JSON string parts — one per record — instead of one concatenated
// megastring. The base64 photos live in the Blob's backing store (which the browser can spill to
// disk), never in a single 100MB+ JS string that then gets copied again into the Blob. Compact,
// not pretty-printed: a backup is a machine file, and the extra whitespace is pure weight.
export async function buildBackupParts(incidents, settings) {
  const meta = await backupMeta(incidents, settings);
  const parts = [JSON.stringify(meta).slice(0, -1) + ',"records":['];  // "{...,"integrity":{...},"records":["
  let count = 0;
  for (const i of incidents) {
    const rec = { ...i, attachments: await serializeAttachments(i.attachments) };
    parts.push((count ? ',' : '') + JSON.stringify(rec));
    count++;
  }
  parts.push(']}');
  return { parts, count, filename: `jobwarden-backup-${dateStamp()}.json` };
}

// Blob form — the app path. new Blob(parts) concatenates into (possibly disk-backed) storage
// without ever materializing the whole JSON as one JS string.
export async function buildBackupBlob(incidents, settings) {
  const { parts, count, filename } = await buildBackupParts(incidents, settings);
  return { blob: new Blob(parts, { type: 'application/json' }), count, filename };
}

// Text form — used by tests and any consumer that needs the string. Materializes it, so the app
// prefers buildBackupBlob for large sets; this stays as the round-trippable pure path.
export async function buildBackupPayload(incidents, settings) {
  const { blob, count, filename } = await buildBackupBlob(incidents, settings);
  return { text: await blob.text(), count, filename };
}

export async function exportJson(incidents, settings) {
  const { blob, count, filename } = await buildBackupBlob(incidents, settings);
  downloadBlob(filename, blob);
  return count;
}

// Same backup, locked with a passphrase. Same records, same fingerprints — only the file
// on disk (and in whatever inbox it lands in) is unreadable without the passphrase.
export async function exportEncryptedJson(incidents, settings, passphrase) {
  const { parts, count } = await buildBackupParts(incidents, settings);
  const blob = await encryptBackup(parts, passphrase);
  downloadBlob(`jobwarden-backup-${dateStamp()}.jwbk`, blob);
  return count;
}
