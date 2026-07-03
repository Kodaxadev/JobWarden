// integrity.js — tamper-evident sealing for records. One concern: deterministic
// canonical serialization + SHA-256 fingerprints, and verifying them later.
//
// What a fingerprint proves: a record's contents and its disclosed edit history have
// not changed since it was sealed, and each photo matches its stored hash. It is a
// SELF-kept fingerprint, NOT a trusted third-party timestamp — it cannot prove the
// times entered are true. (README ethos: structured testimony, not automatic proof.)
//
// Seals are VERSIONED (sealVersion on the record). v2 hashes a PRUNED view — empty
// values ('' / null / empty objects & arrays) are dropped before hashing — so adding
// a new schema field with an empty default never changes the hash of an existing
// record. That keeps old seals verifying forever as the schema grows. (false is NOT
// pruned: "no" answers like relievedOfDuty:false are substantive facts, and pruning
// them would let a tamperer flip "no" to "unknown" undetected.)
import { nowIso } from './timeUtils.js';

export const HASH_ALGO = 'SHA-256';
export const SEAL_VERSION = 2;

const subtle = () => (globalThis.crypto && globalThis.crypto.subtle) || null;
const bytesToHex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

async function sha256Hex(input) {
  const s = subtle();
  if (!s) return '';
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return bytesToHex(await s.digest(HASH_ALGO, data));
}

// Stable JSON: object keys sorted recursively so serialization is order-independent.
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort()
    .map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

// Drop empty values ('' / null / undefined / empty [] / {}) recursively. Keeps false,
// 0, and true — those are answers, not absences.
export function pruneEmpty(value) {
  if (Array.isArray(value)) {
    const out = value.map(pruneEmpty).filter(v => v !== undefined);
    return out.length ? out : undefined;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) {
      const v = pruneEmpty(value[k]);
      if (v !== undefined) out[k] = v;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return (value === '' || value == null) ? undefined : value;
}

// Raw bytes of an attachment: from a Blob/File, or decoded from a stored data URL.
async function attachmentBytes(att) {
  if (att?.blob && typeof att.blob.arrayBuffer === 'function') return new Uint8Array(await att.blob.arrayBuffer());
  if (att?.dataUrl) {
    const b64 = att.dataUrl.slice(att.dataUrl.indexOf(',') + 1);
    const bin = globalThis.atob ? globalThis.atob(b64) : /** @type {any} */ (globalThis).Buffer.from(b64, 'base64').toString('binary');
    const out = new Uint8Array(bin.length);
    for (let j = 0; j < bin.length; j++) out[j] = bin.charCodeAt(j);
    return out;
  }
  return null;
}

export async function attachmentSha256(att) {
  const bytes = await attachmentBytes(att);
  return bytes ? sha256Hex(bytes) : '';
}

// Ensure every attachment carries a sha256 of its file bytes (computed once, then kept).
export async function ensureAttachmentHashes(attachments = []) {
  const out = [];
  for (const a of attachments) {
    if (a && !a.sha256) { const h = await attachmentSha256(a); out.push(h ? { ...a, sha256: h } : a); }
    else out.push(a);
  }
  return out;
}

function attachmentDescriptors(attachments = []) {
  return (attachments || [])
    .map(a => ({ name: a.name || '', type: a.type || '', size: a.size || 0, sha256: a.sha256 || '' }))
    .sort((x, y) => (x.sha256 + x.name).localeCompare(y.sha256 + y.name));
}

// The substantive evidence + provenance the content fingerprint covers.
// Excludes derived/volatile fields (flags), the fingerprints themselves, and the
// edit log + deletion status (those are covered by the record fingerprint).
// jurisdiction is analysis metadata, deliberately not sealed content.

// v1 (legacy, pre-versioning): the dense view of the record's whole normalized shape.
// It did NOT cover finalPay. `withAgreement:false` reproduces the shape from before
// meal.writtenAgreement existed, for records sealed under that older schema.
function contentViewV1(i, { withAgreement = true } = {}) {
  const meal = { ...(i.meal || {}) };
  if (!withAgreement) delete meal.writtenAgreement;
  return {
    createdAt: i.createdAt || '', capturedTz: i.capturedTz || '',
    incidentDate: i.incidentDate || '', workplace: i.workplace || '', location: i.location || null,
    clockIn: i.clockIn || '', clockOut: i.clockOut || '',
    types: [...(i.types || [])].sort(),
    classification: i.classification || {}, meal, meal2: i.meal2 || {},
    rest: i.rest || {}, offClock: i.offClock || {}, notice: i.notice || {},
    witnesses: i.witnesses || '', narrative: i.narrative || '',
    attachments: attachmentDescriptors(i.attachments),
  };
}

// v2 (current): pruned view, and it covers finalPay (separation/last-day/date-paid
// are §201–203 evidence and must be tamper-evident too).
function contentViewV2(i) {
  return pruneEmpty({
    v: 2,
    createdAt: i.createdAt || '', capturedTz: i.capturedTz || '',
    incidentDate: i.incidentDate || '', workplace: i.workplace || '', location: i.location || null,
    clockIn: i.clockIn || '', clockOut: i.clockOut || '',
    types: [...(i.types || [])].sort(),
    classification: i.classification || {}, meal: i.meal || {}, meal2: i.meal2 || {},
    rest: i.rest || {}, offClock: i.offClock || {}, notice: i.notice || {},
    finalPay: i.finalPay || {},
    witnesses: i.witnesses || '', narrative: i.narrative || '',
    attachments: attachmentDescriptors(i.attachments),
  }) || { v: 2 };
}

export function contentView(i, version = SEAL_VERSION) {
  return version >= 2 ? contentViewV2(i) : contentViewV1(i);
}

function recordViewOf(i, contentHash, version = SEAL_VERSION) {
  const view = {
    createdAt: i.createdAt || '', contentHash, deleted: !!i.deleted,
    editLog: (i.editLog || []).map(e => ({
      at: e.at || '', note: e.note || '',
      changes: (e.changes || []).map(c => ({ field: c.field, from: c.from ?? '', to: c.to ?? '' })),
    })),
  };
  if (version >= 2) view.deleteReason = i.deleteReason || '';
  return view;
}

export async function contentHashOf(i, version = SEAL_VERSION) {
  return sha256Hex(stableStringify(contentView(i, version)));
}

// Seal a record: fill attachment hashes, then content + record fingerprints.
// If Web Crypto is unavailable (non-secure context), returns the record unsealed.
export async function stampIntegrity(i) {
  if (!subtle()) return i;
  const attachments = await ensureAttachmentHashes(i.attachments);
  const withAtt = { ...i, attachments, sealVersion: SEAL_VERSION };
  const contentHash = await contentHashOf(withAtt, SEAL_VERSION);
  const recordHash = await sha256Hex(stableStringify(recordViewOf(withAtt, contentHash, SEAL_VERSION)));
  return { ...withAtt, contentHash, recordHash, sealedAt: nowIso() };
}

// Verify a record against its stored fingerprints. Returns flags; never throws.
//
// Prefers i._raw (the exact stored shape, attached non-enumerably by incidentRepo)
// because hydration adds newer schema fields that legacy dense hashes never covered.
// For legacy (unversioned) seals, tries each shape the seal could have covered —
// the raw stored shape, the hydrated shape, and the pre-writtenAgreement shape —
// so schema growth is never misreported as tampering.
export async function verifyIntegrity(i) {
  if (!i || !i.contentHash || !i.recordHash) {
    return { sealed: false, contentOk: false, recordOk: false, attachmentsOk: true, ok: false };
  }
  const src = i._raw || i;
  const version = src.sealVersion || i.sealVersion || 1;

  let contentOk = false;
  if (version >= 2) {
    contentOk = (await contentHashOf(src, version)) === i.contentHash;
  } else {
    const candidates = [
      contentViewV1(src),
      contentViewV1(i),
      contentViewV1(src, { withAgreement: false }),
      contentViewV1(i, { withAgreement: false }),
    ];
    for (const view of candidates) {
      if ((await sha256Hex(stableStringify(view))) === i.contentHash) { contentOk = true; break; }
    }
  }

  const recordOk = (await sha256Hex(stableStringify(recordViewOf(src, i.contentHash, version)))) === i.recordHash;
  let attachmentsOk = true;
  for (const a of (src.attachments || i.attachments || [])) {
    if (!a?.sha256) continue;
    const bytesHash = await attachmentSha256(a);
    if (bytesHash && bytesHash !== a.sha256) { attachmentsOk = false; break; }
  }
  return { sealed: true, contentOk, recordOk, attachmentsOk, ok: contentOk && recordOk && attachmentsOk };
}

// Fingerprint for a whole export set: hash of all record hashes, in order.
export async function manifestHash(incidents = []) {
  return sha256Hex(stableStringify((incidents || []).map(i => i.recordHash || '')));
}
