import { getGoogleConnection, getValidAccessToken, saveGoogleConnection } from '@/lib/googleConnection';
import { findDriveFile, createDriveFile, downloadDriveFile, updateDriveFile, WORKSPACE_FILE_NAME } from '@/lib/googleDriveClient';
import { listTasks, replaceAllTasks } from './tasksRepo';
import { listProjects, replaceAllProjects } from './projectsRepo';
import { mergeRecords } from './workspaceMerge';

// The app's only workspace sync entry point — always bidirectional.
// Downloads whatever's on Drive, reconciles it against what's local
// (mergeRecords: per-record, newest updatedAt wins — see workspaceMerge.js
// for why this is deliberately simpler than a full CRDT/field-level merge),
// writes the reconciled result back to IndexedDB, then pushes that same
// result to Drive so both sides converge. This replaced an earlier
// one-directional push + destructive-pull pair — two separate actions
// turned out to feel unnatural and never brought remote changes back on
// their own; a single always-reconciling command is simpler for both the
// user and the code.

const EXPORT_KIND = 'workspace-export';
const EXPORT_VERSION = 1;

async function resolveWorkspaceFileId(accessToken) {
  const cached = (await getGoogleConnection())?.workspaceFileId;
  if (cached) return cached;
  const existing = await findDriveFile(accessToken, WORKSPACE_FILE_NAME);
  return existing?.id || null;
}

export async function mergeSyncWorkspace() {
  const accessToken = await getValidAccessToken();
  const [localTasks, localProjects] = await Promise.all([listTasks(), listProjects()]);

  let fileId = await resolveWorkspaceFileId(accessToken);
  let remoteTasks = [];
  let remoteProjects = [];
  if (fileId) {
    // Let a failed download abort the whole attempt (propagates up,
    // scheduler retries later) rather than silently treating remote as
    // empty — doing that would let the push step below overwrite real
    // remote data with an incomplete merge.
    const fileBody = await downloadDriveFile(accessToken, fileId);
    if (fileBody?.kind === EXPORT_KIND) {
      remoteTasks = Array.isArray(fileBody.tasks) ? fileBody.tasks : [];
      remoteProjects = Array.isArray(fileBody.projects) ? fileBody.projects : [];
    }
  }

  const mergedTasks = mergeRecords(localTasks, remoteTasks);
  const mergedProjects = mergeRecords(localProjects, remoteProjects);

  await replaceAllTasks(mergedTasks);
  await replaceAllProjects(mergedProjects);

  const fileBody = {
    app: 'canvastools',
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tasks: mergedTasks,
    projects: mergedProjects,
  };
  if (fileId) {
    try {
      await updateDriveFile(accessToken, fileId, fileBody);
    } catch {
      const created = await createDriveFile(accessToken, WORKSPACE_FILE_NAME, fileBody);
      fileId = created.id;
    }
  } else {
    const created = await createDriveFile(accessToken, WORKSPACE_FILE_NAME, fileBody);
    fileId = created.id;
  }

  await saveGoogleConnection({ workspaceFileId: fileId, workspaceLastSuccessfulSyncAt: new Date().toISOString() });
  return {
    tasks: mergedTasks.filter((t) => !t.deletedAt).length,
    projects: mergedProjects.filter((p) => !p.deletedAt).length,
  };
}
