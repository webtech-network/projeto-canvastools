import { openDB } from 'idb';

const DB_NAME = 'canvastools';
const DB_VERSION = 1;

export const STORE_SHORTCUTS = 'shortcuts';
export const STORE_CACHE = 'cache';

let dbPromise = null;

// SSR-safe: Next.js can evaluate a 'use client' module's imports during a
// server bundle pass even though only client code ever calls these — resolve
// to null on the server instead of touching `indexedDB` (which doesn't exist
// there) so every helper below can just check for a null db and no-op.
function getDb() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_SHORTCUTS)) {
          db.createObjectStore(STORE_SHORTCUTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function dbGet(storeName, key) {
  const db = await getDb();
  return db ? db.get(storeName, key) : undefined;
}

export async function dbGetAll(storeName) {
  const db = await getDb();
  return db ? db.getAll(storeName) : [];
}

export async function dbPut(storeName, value) {
  const db = await getDb();
  if (!db) return;
  return db.put(storeName, value);
}

export async function dbDelete(storeName, key) {
  const db = await getDb();
  if (!db) return;
  return db.delete(storeName, key);
}

export async function dbClear(storeName) {
  const db = await getDb();
  if (!db) return;
  return db.clear(storeName);
}
