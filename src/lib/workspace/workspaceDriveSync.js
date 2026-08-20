import { getGoogleConnection, getValidAccessToken, saveGoogleConnection } from '@/lib/googleConnection';
import { findDriveFile, createDriveFile, downloadDriveFile, updateDriveFile, WORKSPACE_FILE_NAME } from '@/lib/googleDriveClient';
import { listTasks, replaceAllTasks } from './tasksRepo';
import { listProjects, replaceAllProjects } from './projectsRepo';

// Mirrors googleDriveSync.js's shape exactly (same resolve-fileId /
// recreate-on-stale-fileId pattern), but for the workspace's own separate
// Drive file — see CLAUDE.md / the Phase 2 plan for why this is a second
// file rather than folded into the settings envelope. No encryption: task
// titles/descriptions aren't credentials, same reasoning settingsExport.js
// already applies to aiModels staying unconditionally plaintext.

const EXPORT_KIND = 'workspace-export';
const EXPORT_VERSION = 1;

async function resolveWorkspaceFileId(accessToken) {
  const cached = (await getGoogleConnection())?.workspaceFileId;
  if (cached) return cached;
  const existing = await findDriveFile(accessToken, WORKSPACE_FILE_NAME);
  return existing?.id || null;
}

export async function pushWorkspaceToGoogleDrive() {
  const accessToken = await getValidAccessToken();
  const [tasks, projects] = await Promise.all([listTasks(), listProjects()]);
  const fileBody = {
    app: 'canvastools',
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tasks,
    projects,
  };

  let fileId = await resolveWorkspaceFileId(accessToken);
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
}

export async function pullWorkspaceFromGoogleDrive() {
  const accessToken = await getValidAccessToken();

  const fileId = await resolveWorkspaceFileId(accessToken);
  if (!fileId) {
    throw new Error('Nenhum arquivo de tarefas encontrado no Google Drive.');
  }

  const fileBody = await downloadDriveFile(accessToken, fileId);
  if (fileBody?.kind !== EXPORT_KIND) {
    throw new Error('Arquivo inválido: não é um export de tarefas do CanvasTools.');
  }

  const projects = await replaceAllProjects(Array.isArray(fileBody.projects) ? fileBody.projects : []);
  const tasks = await replaceAllTasks(Array.isArray(fileBody.tasks) ? fileBody.tasks : []);

  await saveGoogleConnection({ workspaceFileId: fileId, workspaceLastSuccessfulSyncAt: new Date().toISOString() });
  return { tasks, projects };
}
