// db.js — IndexedDB connection + schema. One concern: database setup & transaction plumbing.
const DB_NAME = 'jobwarden';
const DB_VERSION = 1;
export const STORE_INCIDENTS = 'incidents';
export const STORE_SETTINGS = 'settings';

let _dbPromise = null;

export function openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_INCIDENTS)) {
        const s = db.createObjectStore(STORE_INCIDENTS, { keyPath: 'id' });
        s.createIndex('byDate', 'incidentDate');
        s.createIndex('byCreated', 'createdAt');
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
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
