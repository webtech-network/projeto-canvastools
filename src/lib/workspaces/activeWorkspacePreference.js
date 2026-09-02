import { BASE_WORKSPACE_ID } from './workspacesRepo';

// Deliberately just localStorage, no session-tier override like
// tasksViewPreferences.js's two-tier scheme — the active workspace is a
// per-device choice, not something exported/synced (decision: the active
// workspace selector is local-only, never sent to Google Drive alongside
// the workspaces themselves).
const ACTIVE_WORKSPACE_KEY = 'canvastools:active-workspace-id';

export function getActiveWorkspaceId() {
  if (typeof window === 'undefined') return BASE_WORKSPACE_ID;
  try {
    return window.localStorage.getItem(ACTIVE_WORKSPACE_KEY) || BASE_WORKSPACE_ID;
  } catch {
    return BASE_WORKSPACE_ID;
  }
}

export function setActiveWorkspaceId(id) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  } catch {
    // best-effort — worst case the choice doesn't survive a reload
  }
}
