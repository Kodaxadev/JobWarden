// db.js — IndexedDB connection + schema. One concern: database setup & transaction plumbing.
const DB_NAME = 'jobwarden';
export const STORE_INCIDENTS = 'incidents';
export const STORE_SETTINGS = 'settings';

// Ordered schema steps. MIGRATIONS[n] takes the database from version n to version n+1, and
// `onupgradeneeded` runs every step between the version on the device and DB_VERSION — so a
// phone that has not opened the app in a year still lands on the current schema, in order.
//
// Rules for adding a step (this is evidence storage; a botched upgrade loses records):
//   1. APPEND a function, never edit or reorder an existing one — devices in the field have
//      already run them, and rewriting history means those devices skip the new intent.
//   2. Use only the upgrade transaction passed in. It is the one transaction where stores and
//      indexes can be created, and it is NOT async-safe — no awaits inside a step.
//   3. Never delete data in a step. Add stores, add indexes, backfill; leave removal to a
//      deliberate, separately reviewed migration.
//   4. Steps must be idempotent-safe against a partially-created database (check
//      objectStoreNames / indexNames before creating), because a failed upgrade can retry.
export const MIGRATIONS = [
  // v0 -> v1: the original schema — incidents keyed by id, settings keyed by key.
  (db) => {
    if (!db.objectStoreNames.contains(STORE_INCIDENTS)) {
      const s = db.createObjectStore(STORE_INCIDENTS, { keyPath: 'id' });
      s.createIndex('byDate', 'incidentDate');
      s.createIndex('byCreated', 'createdAt');
    }
    if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
      db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
    }
  },
];

export const DB_VERSION = MIGRATIONS.length;

let _dbPromise = null;

export function openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const idb = globalThis.indexedDB;
    if (!idb) { reject(new Error('IndexedDB unavailable')); return; }
    const req = idb.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const from = e.oldVersion || 0;
      for (let v = from; v < DB_VERSION; v++) MIGRATIONS[v](req.result, req.transaction);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // A version the device already exceeded (user downgraded, or two tabs disagree):
    // fail loudly rather than silently operating against an unknown schema.
    req.onblocked = () => reject(new Error('Close JobWarden in your other tabs, then try again.'));
  });
  // A failed open should not be cached forever — let the next call retry.
  _dbPromise.catch(() => { _dbPromise = null; });
  return _dbPromise;
}

// Test seam: drop the cached connection so a fresh open re-runs the migration ladder.
export function _resetDbForTests() {
  _dbPromise = null;
}

// Run fn(store) inside a transaction; resolves with fn's return after the tx commits.
export async function tx(storeName, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    let result;
    Promise.resolve(fn(store)).then(r => { result = r; }).catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Best-effort request to make storage persistent so the browser won't evict evidence.
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted?.();
      if (already) return true;
      return await navigator.storage.persist();
    }
  } catch { /* ignore */ }
  return false;
}
