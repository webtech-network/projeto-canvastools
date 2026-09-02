import { getGoogleConnection } from '@/lib/googleConnection';
import { mergeSyncTasks } from '@/lib/tasks/tasksDriveSync';
import { setTasksSyncState, getSyncStatusSnapshot } from './syncStatusStore';

// Debounced push to Drive after task/project edits — called from
// TasksProvider.jsx's mutation wrappers, never from tasksRepo.js/
// projectsRepo.js directly (that would create a static circular import:
// tasksRepo -> scheduler -> tasksDriveSync -> tasksRepo).
//
// The setTimeout here is a plain browser timer with no React lifecycle tie —
// once scheduled, it fires regardless of whether /tarefas (and
// TasksProvider along with it) has since unmounted, as long as the tab
// stays open. That's what makes "navigate away before the debounce fires"
// still work.
const DEBOUNCE_MS = 3000;
let debounceTimer = null;

export function scheduleTasksSync() {
  if (typeof window === 'undefined') return;
  setTasksSyncState({ state: 'pending' });
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runTasksSync, DEBOUNCE_MS);
}

// Bypasses the debounce — used by SyncStatusIndicator.jsx's "Sincronizar
// agora" button.
export function flushTasksSyncNow() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  return runTasksSync();
}

async function runTasksSync() {
  debounceTimer = null;
  const connection = await getGoogleConnection();
  if (!connection) {
    setTasksSyncState({ state: 'not-connected' });
    return;
  }
  if (!navigator.onLine) {
    setTasksSyncState({ state: 'offline' });
    return;
  }

  setTasksSyncState({ state: 'syncing' });
  try {
    await mergeSyncTasks();
    setTasksSyncState({ state: 'synced', lastSyncAt: new Date().toISOString(), error: null });
  } catch (err) {
    const reauth = /Reconecte em \/perfil/.test(err.message || '');
    setTasksSyncState({ state: reauth ? 'reauth-required' : 'error', error: err.message });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (getSyncStatusSnapshot().tasks.state === 'offline') scheduleTasksSync();
  });
}
