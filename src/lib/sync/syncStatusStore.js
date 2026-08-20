// Plain module-level pub/sub singleton — not React Context. This needs to
// survive /tarefas unmounting (workspaceSyncScheduler.js keeps running
// after the user navigates away) and be readable from Topbar.jsx's subtree
// regardless of the current route, so a Context tied to some page's mount
// lifecycle wouldn't fit. Shaped for React's useSyncExternalStore (built
// into React 19, no new dependency) — see SyncStatusIndicator.jsx.
//
// 'not-connected' covers both "never connected Google" and "disconnected" —
// there's no user-facing difference between the two, so a single resting
// state avoids inventing a distinction nobody needs.

function defaultDomain() {
  return { state: 'not-connected', lastSyncAt: null, error: null };
}

let snapshot = { workspace: defaultDomain(), settings: defaultDomain() };
// Stable reference for SSR (see getServerSyncStatusSnapshot) — Topbar.jsx is
// a Server Component, so SyncStatusIndicator.jsx's initial render happens
// server-side too; useSyncExternalStore requires a getServerSnapshot to
// avoid throwing during that pass.
const SERVER_SNAPSHOT = { workspace: defaultDomain(), settings: defaultDomain() };

const listeners = new Set();

export function subscribeSyncStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSyncStatusSnapshot() {
  return snapshot;
}

export function getServerSyncStatusSnapshot() {
  return SERVER_SNAPSHOT;
}

function setDomain(key, patch) {
  snapshot = { ...snapshot, [key]: { ...snapshot[key], ...patch } };
  listeners.forEach((listener) => listener());
}

export function setWorkspaceSyncState(patch) {
  setDomain('workspace', patch);
}

export function setSettingsSyncState(patch) {
  setDomain('settings', patch);
}

// Called on disconnect (GoogleConnection.jsx) so the indicator drops back to
// a neutral state immediately instead of showing a stale synced/error badge
// for a connection that no longer exists.
export function resetSyncStatus() {
  snapshot = { workspace: defaultDomain(), settings: defaultDomain() };
  listeners.forEach((listener) => listener());
}
