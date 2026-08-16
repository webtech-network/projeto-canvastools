import { getGoogleConnection, getValidAccessToken, saveGoogleConnection } from './googleConnection';
import { findSettingsFile, createSettingsFile, downloadSettingsFile, updateSettingsFile } from './googleDriveClient';
import { buildSettingsPayload, applySettingsPayload } from './settingsExport';

// No conflict detection in this first slice (no revision/hash machinery
// yet) — push and pull are two explicit, distinct actions instead of one
// "sync" button with an implicit direction, so neither side is silently
// overwritten. See CLAUDE.md's "Google Drive preferences sync" section.

async function resolveFileId(accessToken) {
  const cached = (await getGoogleConnection())?.fileId;
  if (cached) return cached;
  const existing = await findSettingsFile(accessToken);
  return existing?.id || null;
}

/** local -> Drive. Reuses the exact same envelope settingsExport.js already
 * builds for the manual file export (see buildSettingsPayload). */
export async function pushToGoogleDrive({ includeSecrets, password } = {}) {
  const accessToken = await getValidAccessToken();
  const fileBody = await buildSettingsPayload({ includeSecrets, password });

  let fileId = await resolveFileId(accessToken);
  if (fileId) {
    try {
      await updateSettingsFile(accessToken, fileId, fileBody);
    } catch {
      // cached/found fileId no longer valid (e.g. deleted remotely) — recreate
      const created = await createSettingsFile(accessToken, fileBody);
      fileId = created.id;
    }
  } else {
    const created = await createSettingsFile(accessToken, fileBody);
    fileId = created.id;
  }

  await saveGoogleConnection({ fileId, lastSuccessfulSyncAt: new Date().toISOString() });
}

/** Drive -> local. Reuses applySettingsPayload — same replace-not-merge
 * behavior as the manual file import. */
export async function pullFromGoogleDrive({ password } = {}) {
  const accessToken = await getValidAccessToken();

  const fileId = await resolveFileId(accessToken);
  if (!fileId) {
    throw new Error('Nenhum arquivo de preferências encontrado no Google Drive.');
  }

  const fileBody = await downloadSettingsFile(accessToken, fileId);
  const results = await applySettingsPayload(fileBody, { password });

  await saveGoogleConnection({ fileId, lastSuccessfulSyncAt: new Date().toISOString() });
  return results;
}
