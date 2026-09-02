import { getGoogleConnection, getValidAccessToken, saveGoogleConnection } from '@/lib/googleConnection';
import { findDriveFile, createDriveFile, downloadDriveFile, updateDriveFile, WORKSPACES_FILE_NAME } from '@/lib/googleDriveClient';
import { mergeRecords } from '../recordMerge';
import { listAllLinks, replaceAllWorkspaces, replaceAllLinks } from './workspacesRepo';
import { dbGetAll, STORE_WORKSPACES } from '../indexedDb';

// Mirrors tasks/tasksDriveSync.js's mergeSyncTasks() exactly — same
// bidirectional reconcile-both-ways shape, just for `workspaces` and
// `workspaceLinks` instead of `tasks`/`projects`. The Base workspace never
// appears in this file (it isn't a stored record — see workspacesRepo.js's
// BASE_WORKSPACE), so this payload only ever contains real, user-created
// workspaces and their links.

export const WORKSPACES_EXPORT_KIND = 'workspaces-export';
export const WORKSPACES_EXPORT_VERSION = 1;

async function resolveWorkspacesFileId(accessToken) {
  const cached = (await getGoogleConnection())?.workspacesFileId;
  if (cached) return cached;
  const existing = await findDriveFile(accessToken, WORKSPACES_FILE_NAME);
  return existing?.id || null;
}

export async function mergeSyncWorkspaces() {
  const accessToken = await getValidAccessToken();
  const [localWorkspaces, localLinks] = await Promise.all([dbGetAll(STORE_WORKSPACES), listAllLinks()]);

  let fileId = await resolveWorkspacesFileId(accessToken);
  let remoteWorkspaces = [];
  let remoteLinks = [];
  if (fileId) {
    // Same "never treat a failed download as an empty remote" reasoning as
    // mergeSyncTasks — a network hiccup here must abort the whole attempt,
    // not let the push step below overwrite real remote data.
    const fileBody = await downloadDriveFile(accessToken, fileId);
    if (fileBody?.kind === WORKSPACES_EXPORT_KIND) {
      remoteWorkspaces = Array.isArray(fileBody.workspaces) ? fileBody.workspaces : [];
      remoteLinks = Array.isArray(fileBody.workspaceLinks) ? fileBody.workspaceLinks : [];
    }
  }

  const mergedWorkspaces = mergeRecords(localWorkspaces, remoteWorkspaces);
  const mergedLinks = mergeRecords(localLinks, remoteLinks);

  await replaceAllWorkspaces(mergedWorkspaces);
  await replaceAllLinks(mergedLinks);

  const fileBody = {
    app: 'canvastools',
    kind: WORKSPACES_EXPORT_KIND,
    version: WORKSPACES_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    workspaces: mergedWorkspaces,
    workspaceLinks: mergedLinks,
  };
  if (fileId) {
    try {
      await updateDriveFile(accessToken, fileId, fileBody);
    } catch {
      const created = await createDriveFile(accessToken, WORKSPACES_FILE_NAME, fileBody);
      fileId = created.id;
    }
  } else {
    const created = await createDriveFile(accessToken, WORKSPACES_FILE_NAME, fileBody);
    fileId = created.id;
  }

  await saveGoogleConnection({ workspacesFileId: fileId, workspacesLastSuccessfulSyncAt: new Date().toISOString() });
  return {
    workspaces: mergedWorkspaces.filter((w) => !w.deletedAt).length,
    workspaceLinks: mergedLinks.filter((l) => !l.deletedAt).length,
  };
}
