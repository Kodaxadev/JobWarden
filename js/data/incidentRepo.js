// incidentRepo.js — CRUD for incidents. One concern: incident persistence.
// Reads pass records through hydrateIncident so legacy (v1) records are upgraded to the
// current schema (fills meal2/offClock/classification defaults, recomputes flags) on the way out.
import { STORE_INCIDENTS, tx, reqToPromise } from './db.js';
import { hydrateIncident } from '../domain/incidentModel.js';

export function addIncident(incident) {
  return tx(STORE_INCIDENTS, 'readwrite', s => reqToPromise(s.add(incident)));
}

export function putIncident(incident) {
  return tx(STORE_INCIDENTS, 'readwrite', s => reqToPromise(s.put(incident)));
}

export function getIncident(id) {
  return tx(STORE_INCIDENTS, 'readonly', async s => {
    const item = await reqToPromise(s.get(id));
    return item ? hydrateIncident(item) : item;
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
  return (all || []).map(hydrateIncident).filter(i => includeDeleted || !i.deleted).sort(byNewest);
}

// Soft-deleted records only (for the recoverable "Deleted" view).
export async function getDeletedIncidents() {
  const all = await tx(STORE_INCIDENTS, 'readonly', s => reqToPromise(s.getAll()));
  return (all || []).map(hydrateIncident).filter(i => i.deleted).sort(byNewest);
}

// Count of ACTIVE records (used by the backup banner).
export async function countIncidents() {
  const all = await tx(STORE_INCIDENTS, 'readonly', s => reqToPromise(s.getAll()));
  return (all || []).filter(i => !i.deleted).length;
}
