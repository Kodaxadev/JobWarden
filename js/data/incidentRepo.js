// incidentRepo.js — CRUD for incidents. One concern: incident persistence.
// Reads pass records through hydrateIncident so legacy (v1) records are upgraded to the
// current schema (fills meal2/offClock/classification defaults, recomputes flags) on the way out.
import { STORE_INCIDENTS, tx, reqToPromise } from './db.js';
import { hydrateIncident } from '../domain/incidentModel.js';
import { stampIntegrity } from '../domain/integrity.js';

// Hydrate for the app, but keep the exact stored shape reachable for seal verification:
// legacy (pre-versioning) fingerprints hashed the shape of their day, and hydration adds
// newer schema fields. Non-enumerable so it never spreads into edits or back into storage.
function hydrateKeepingRaw(stored) {
  const h = hydrateIncident(stored);
  Object.defineProperty(h, '_raw', { value: stored, enumerable: false, configurable: true });
  return h;
}

// Records are sealed (content + record SHA-256 fingerprints, plus per-photo hashes)
// on the way into storage, so every create/edit/delete reseals the tamper-evident state.
export async function addIncident(incident) {
  const sealed = await stampIntegrity(incident);
  return tx(STORE_INCIDENTS, 'readwrite', s => reqToPromise(s.add(sealed)));
}

export async function putIncident(incident) {
  const sealed = await stampIntegrity(incident);
  return tx(STORE_INCIDENTS, 'readwrite', s => reqToPromise(s.put(sealed)));
}

// Raw put without re-sealing — restore/import uses this to keep a record's ORIGINAL
// fingerprints + sealedAt exactly as they were backed up.
export function putIncidentRaw(incident) {
  return tx(STORE_INCIDENTS, 'readwrite', s => reqToPromise(s.put(incident)));
}

export function getIncident(id) {
  return tx(STORE_INCIDENTS, 'readonly', async s => {
    const item = await reqToPromise(s.get(id));
    return item ? hydrateKeepingRaw(item) : item;
  });
}

export function deleteIncident(id) {
  return tx(STORE_INCIDENTS, 'readwrite', s => reqToPromise(s.delete(id)));
}

const byNewest = (a, b) =>
  (b.incidentDate || '').localeCompare(a.incidentDate || '') ||
  (b.createdAt || '').localeCompare(a.createdAt || '');

// Active records (soft-deleted excluded unless includeDeleted), newest first.
export async function getAllIncidents({ includeDeleted = false } = {}) {
  const all = await tx(STORE_INCIDENTS, 'readonly', s => reqToPromise(s.getAll()));
  return (all || []).map(hydrateKeepingRaw).filter(i => includeDeleted || !i.deleted).sort(byNewest);
}

// Soft-deleted records only (for the recoverable "Deleted" view).
export async function getDeletedIncidents() {
  const all = await tx(STORE_INCIDENTS, 'readonly', s => reqToPromise(s.getAll()));
  return (all || []).map(hydrateKeepingRaw).filter(i => i.deleted).sort(byNewest);
}

// Active, recoverable-Deleted, and everything — from ONE pass over the store. Records and
// Export each need two of the three, and asking twice reads every record twice and re-runs
// the rules engine over each one twice, which is the most expensive thing either screen does.
export async function getIncidentGroups() {
  const all = await getAllIncidents({ includeDeleted: true });
  return { active: all.filter(i => !i.deleted), deleted: all.filter(i => i.deleted), all };
}

// Active by default; backup reminders can include recoverable Deleted records.
export async function countIncidents({ includeDeleted = false } = {}) {
  return tx(STORE_INCIDENTS, 'readonly', async s => {
    if (includeDeleted) return reqToPromise(s.count()); // a count the store can answer on its own
    // No index can answer this one: IndexedDB keys cannot be booleans, so `deleted` is not
    // indexable. Read the values, but do NOT hydrate — running the rules engine over every
    // record to produce a number is work the backup banner repeats on every save.
    const all = await reqToPromise(s.getAll());
    return (all || []).filter(i => !i.deleted).length;
  });
}
