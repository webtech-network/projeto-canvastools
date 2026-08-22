// Plain module-level pub/sub singleton — same pattern as
// src/lib/sync/syncStatusStore.js — holding the deferred `beforeinstallprompt`
// event so any component (UserMenu.jsx) can offer an "Instalar app" action
// without needing to own the listener itself. capturePrompt/markInstalled
// are called from ServiceWorkerRegistration.jsx, the app's one headless
// "PWA-related side effects" component.

let deferredPrompt = null;
let installed = false;
const listeners = new Set();

// useSyncExternalStore requires the snapshot getter to return the SAME
// object reference between calls unless the underlying state actually
// changed (it compares via Object.is) — returning a fresh `{ available }`
// literal on every call, even when nothing changed, makes every render
// "look like" a change and triggers an infinite render loop. This cached
// snapshot is only replaced (a new object) inside recompute(), called from
// the two mutators below, never from the getter itself.
let snapshot = { available: false };

function recompute() {
  const available = Boolean(deferredPrompt) && !installed;
  if (available !== snapshot.available) snapshot = { available };
}

function notify() {
  recompute();
  listeners.forEach((listener) => listener());
}

export function capturePrompt(event) {
  deferredPrompt = event;
  notify();
}

export function markInstalled() {
  deferredPrompt = null;
  installed = true;
  notify();
}

export function getInstallSnapshot() {
  return snapshot;
}

const SERVER_SNAPSHOT = { available: false };
export function getServerInstallSnapshot() {
  return SERVER_SNAPSHOT;
}

export function subscribeInstall(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Chrome/Edge/Android only — the event this reads from only exists on
// browsers that support it; iOS Safari never calls capturePrompt, so
// `available` there just stays false forever (see UserMenu.jsx's comment).
export async function triggerInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
}
