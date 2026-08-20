import { getGoogleConnection } from '@/lib/googleConnection';
import { pushWorkspaceToGoogleDrive } from '@/lib/workspace/workspaceDriveSync';
import { setWorkspaceSyncState, getSyncStatusSnapshot } from './syncStatusStore';

// Debounced push to Drive after workspace edits — called from
// WorkspaceProvider.jsx's mutation wrappers, never from tasksRepo.js/
// projectsRepo.js directly (that would create a static circular import:
// tasksRepo -> scheduler -> workspaceDriveSync -> tasksRepo).
//
// The setTimeout here is a plain browser timer with no React lifecycle tie —
// once scheduled, it fires regardless of whether /tarefas (and
// WorkspaceProvider along with it) has since unmounted, as long as the tab
// stays open. That's what makes "navigate away before the debounce fires"
// still work.
const DEBOUNCE_MS = 3000;
let debounceTimer = null;

export function scheduleWorkspaceSync() {
  if (typeof window === 'undefined') return;
  setWorkspaceSyncState({ state: 'pending' });
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runWorkspaceSync, DEBOUNCE_MS);
}

// Bypasses the debounce — used by SyncStatusIndicator.jsx's "Sincronizar
// agora" button.
export function flushWorkspaceSyncNow() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  return runWorkspaceSync();
}

async function runWorkspaceSync() {
  debounceTimer = null;
  const connection = await getGoogleConnection();
  if (!connection) {
    setWorkspaceSyncState({ state: 'not-connected' });
    return;
  }
  if (!navigator.onLine) {
    setWorkspaceSyncState({ state: 'offline' });
    return;
  }

  setWorkspaceSyncState({ state: 'syncing' });
  try {
    await pushWorkspaceToGoogleDrive();
    setWorkspaceSyncState({ state: 'synced', lastSyncAt: new Date().toISOString(), error: null });
  } catch (err) {
    const reauth = /Reconecte em \/perfil/.test(err.message || '');
    setWorkspaceSyncState({ state: reauth ? 'reauth-required' : 'error', error: err.message });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (getSyncStatusSnapshot().workspace.state === 'offline') scheduleWorkspaceSync();
  });
}
