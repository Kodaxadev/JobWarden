// importBackup.js — "Restore from backup". One concern: reading a JobWarden backup file
// back into the device. The missing half of durability: back up -> reinstall/new phone ->
// restore. Additive and non-destructive: existing records are kept, duplicates (same id)
// are skipped, and each record's fingerprint is checked so a tampered file is flagged.
import { verifyIntegrity } from '../domain/integrity.js';
import { getIncident, putIncidentRaw } from '../data/incidentRepo.js';

// Validate + parse a backup file's text. Throws a plain-language Error on anything unexpected.
export function parseBackup(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('That file is not readable as a backup.'); }
  if (!data || data.app !== 'JobWarden' || !Array.isArray(data.records)) {
    throw new Error('That is not a JobWarden backup file.');
  }
  return data;
}

// A backup file is untrusted input — truncated by a mail client, hand-edited, or written by a
// version that never shipped. Records are stored EXACTLY as sealed, so a wrong-typed field
// cannot be coerced on the way in without breaking its own fingerprint. Instead, refuse the
// ones that would break the app after they land: a list read sorts on incidentDate, and every
// screen and export maps over types and attachments. One of those wrong and Records, Export
// and backup all throw — with the bad record now saved, so a reload does not fix it.
export function restorableRecord(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  if (typeof raw.id !== 'string' || !raw.id) return false; // this is the database key
  for (const k of ['types', 'attachments', 'editLog']) {
    if (raw[k] != null && !Array.isArray(raw[k])) return false;
  }
  for (const k of ['incidentDate', 'createdAt', 'workplace', 'narrative']) {
    if (raw[k] != null && typeof raw[k] !== 'string') return false;
  }
  return true;
}

// Restore records from backup text. Returns { added, skipped, changed, unreadable, total }.
export async function importBackup(text) {
  const data = parseBackup(text);
  let added = 0, skipped = 0, changed = 0, unreadable = 0;
  for (const raw of data.records) {
    if (!restorableRecord(raw)) { unreadable++; continue; }
    if (await getIncident(raw.id)) { skipped++; continue; }     // already on this device
    const v = await verifyIntegrity(raw);                        // check the file's record exactly as sealed
    if (v.sealed && !v.ok) changed++;                            // fingerprint mismatch — flag, still restore
    await putIncidentRaw(raw);                                   // store the sealed shape untouched (reads hydrate)
    added++;
  }
  return { added, skipped, changed, unreadable, total: data.records.length };
}
