import { dbGet, dbPut, STORE_CACHE } from './indexedDb';

// Thin wrapper over the shared `cache` IndexedDB store, scoped to the
// dashboard's Canvas-derived aggregates (dashboard:courses,
// dashboard:messages, dashboard:assignments) — kept separate from
// shortcuts.js conceptually (ephemeral derived data vs. user-authored data)
// even though both live in the same physical object store.
export async function readCache(key) {
  const row = await dbGet(STORE_CACHE, key);
  return row ? { data: row.data, fetchedAt: row.fetchedAt } : null;
}

export async function writeCache(key, data) {
  await dbPut(STORE_CACHE, { key, data, fetchedAt: Date.now() });
}
