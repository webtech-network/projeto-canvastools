import { getGoogleConnection, getValidAccessToken, saveGoogleConnection } from './googleConnection';
import { findDriveFile, createDriveFile, downloadDriveFile, updateDriveFile, SETTINGS_FILE_NAME } from './googleDriveClient';
import { buildSettingsPayload, applySettingsPayload } from './settingsExport';
import { setSettingsSyncState } from './sync/syncStatusStore';

function isReauthError(err) {
  return /Reconecte em \/perfil/.test(err.message || '');
}

// No conflict detection in this first slice (no revision/hash machinery
// yet) — push and pull are two explicit, distinct actions instead of one
// "sync" button with an implicit direction, so neither side is silently
// overwritten. See CLAUDE.md's "Google Drive preferences sync" section.

async function resolveFileId(accessToken) {
  const cached = (await getGoogleConnection())?.fileId;
  if (cached) return cached;
  const existing = await findDriveFile(accessToken, SETTINGS_FILE_NAME);
  return existing?.id || null;
}

/** local -> Drive. Reuses the exact same envelope settingsExport.js already
 * builds for the manual file export (see buildSettingsPayload). */
export async function pushToGoogleDrive({ includeSecrets, password } = {}) {
  setSettingsSyncState({ state: 'syncing' });
  try {
    const accessToken = await getValidAccessToken();
    const fileBody = await buildSettingsPayload({ includeSecrets, password });

    let fileId = await resolveFileId(accessToken);
    if (fileId) {
      try {
        await updateDriveFile(accessToken, fileId, fileBody);
      } catch {
        // cached/found fileId no longer valid (e.g. deleted remotely) — recreate
        const created = await createDriveFile(accessToken, SETTINGS_FILE_NAME, fileBody);
        fileId = created.id;
      }
    } else {
      const created = await createDriveFile(accessToken, SETTINGS_FILE_NAME, fileBody);
      fileId = created.id;
    }

    const lastSuccessfulSyncAt = new Date().toISOString();
    await saveGoogleConnection({ fileId, lastSuccessfulSyncAt });
    setSettingsSyncState({ state: 'synced', lastSyncAt: lastSuccessfulSyncAt, error: null });
  } catch (err) {
    setSettingsSyncState({ state: isReauthError(err) ? 'reauth-required' : 'error', error: err.message });
    throw err;
  }
}

/** Drive -> local. Reuses applySettingsPayload — same replace-not-merge
 * behavior as the manual file import. */
export async function pullFromGoogleDrive({ password } = {}) {
  setSettingsSyncState({ state: 'syncing' });
  try {
    const accessToken = await getValidAccessToken();

    const fileId = await resolveFileId(accessToken);
    if (!fileId) {
      throw new Error('Nenhum arquivo de preferências encontrado no Google Drive.');
    }

    const fileBody = await downloadDriveFile(accessToken, fileId);
    const results = await applySettingsPayload(fileBody, { password });

    const lastSuccessfulSyncAt = new Date().toISOString();
    await saveGoogleConnection({ fileId, lastSuccessfulSyncAt });
    setSettingsSyncState({ state: 'synced', lastSyncAt: lastSuccessfulSyncAt, error: null });
    return results;
  } catch (err) {
    setSettingsSyncState({ state: isReauthError(err) ? 'reauth-required' : 'error', error: err.message });
    throw err;
  }
}
