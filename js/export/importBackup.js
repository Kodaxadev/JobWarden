// importBackup.js — "Restore from backup". One concern: reading a JobWarden backup file
// back into the device. The missing half of durability: back up -> reinstall/new phone ->
// restore. Additive and non-destructive: existing records are kept, duplicates (same id)
// are skipped, and each record's fingerprint is checked so a tampered file is flagged.
import { hydrateIncident } from '../domain/incidentModel.js';
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

// Restore records from backup text. Returns { added, skipped, changed, total }.
export async function importBackup(text) {
  const data = parseBackup(text);
  let added = 0, skipped = 0, changed = 0;
  for (const raw of data.records) {
    if (!raw || !raw.id) { skipped++; continue; }
    if (await getIncident(raw.id)) { skipped++; continue; }     // already on this device
    const rec = hydrateIncident(raw);                            // normalize; keeps original hashes
    const v = await verifyIntegrity(rec);
    if (v.sealed && !v.ok) changed++;                            // fingerprint mismatch — flag, still restore
    await putIncidentRaw(rec);                                   // store as-is (preserve original seal)
    added++;
  }
  return { added, skipped, changed, total: data.records.length };
}
