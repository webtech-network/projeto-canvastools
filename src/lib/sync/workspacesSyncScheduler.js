import { getGoogleConnection } from '@/lib/googleConnection';
import { mergeSyncWorkspaces } from '@/lib/workspaces/workspacesDriveSync';
import { setWorkspacesSyncState, getSyncStatusSnapshot } from './syncStatusStore';

// Mirrors tasks/tasksSyncScheduler.js exactly — a separate small debounced
// scheduler per domain, not a shared/generic one, following the same
// per-domain-file isolation already used across this app's Drive sync
// (see googleDriveClient.js's own comment on why settings/tasks/course-notes
// are three separate files instead of one).
const DEBOUNCE_MS = 3000;
let debounceTimer = null;

export function scheduleWorkspacesSync() {
  if (typeof window === 'undefined') return;
  setWorkspacesSyncState({ state: 'pending' });
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runWorkspacesSync, DEBOUNCE_MS);
}

// Bypasses the debounce — called once on WorkspaceScopeProvider mount, and
// available to SyncStatusIndicator.jsx's "Sincronizar agora" action.
export function flushWorkspacesSyncNow() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  return runWorkspacesSync();
}

async function runWorkspacesSync() {
  debounceTimer = null;
  const connection = await getGoogleConnection();
  if (!connection) {
    setWorkspacesSyncState({ state: 'not-connected' });
    return;
  }
  if (!navigator.onLine) {
    setWorkspacesSyncState({ state: 'offline' });
    return;
  }

  setWorkspacesSyncState({ state: 'syncing' });
  try {
    await mergeSyncWorkspaces();
    setWorkspacesSyncState({ state: 'synced', lastSyncAt: new Date().toISOString(), error: null });
  } catch (err) {
    const reauth = /Reconecte em \/perfil/.test(err.message || '');
    setWorkspacesSyncState({ state: reauth ? 'reauth-required' : 'error', error: err.message });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (getSyncStatusSnapshot().workspaces.state === 'offline') scheduleWorkspacesSync();
  });
}
