// Plain module-level pub/sub singleton — same pattern as
// src/lib/sync/syncStatusStore.js — holding the deferred `beforeinstallprompt`
// event so any component (UserMenu.jsx) can offer an "Instalar app" action
// without needing to own the listener itself. capturePrompt/markInstalled
// are called from ServiceWorkerRegistration.jsx, the app's one headless
// "PWA-related side effects" component.

// Chrome can fire beforeinstallprompt as soon as it finishes evaluating
// installability — which can happen before this app's own JS has hydrated
// and attached a listener, silently dropping the event. INSTALL_PROMPT_CAPTURE_SCRIPT
// is inlined verbatim into a beforeInteractive <Script> in layout.jsx (same
// technique as theme.js's THEME_INIT_SCRIPT) so a listener is live from the
// very first paint, stashing the event on `window` until this module's own
// effect (ServiceWorkerRegistration.jsx) picks it up on mount.
export const INSTALL_PROMPT_GLOBAL_KEY = '__cvtDeferredInstallPrompt';
export const INSTALL_PROMPT_READY_EVENT = 'cvt:install-prompt-ready';
export const INSTALL_PROMPT_CAPTURE_SCRIPT = `
(function () {
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.${INSTALL_PROMPT_GLOBAL_KEY} = e;
    window.dispatchEvent(new Event('${INSTALL_PROMPT_READY_EVENT}'));
  });
})();
`;

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

// Called once from ServiceWorkerRegistration.jsx's mount effect — picks up
// whatever the early beforeInteractive script (INSTALL_PROMPT_CAPTURE_SCRIPT
// above) already stashed before this module even loaded, closing the
// hydration-timing gap described above. A no-op if nothing was stashed
// (the event hasn't fired yet, or this browser doesn't support it at all).
export function claimStashedPrompt() {
  if (typeof window === 'undefined') return;
  const stashed = window[INSTALL_PROMPT_GLOBAL_KEY];
  if (stashed) capturePrompt(stashed);
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
