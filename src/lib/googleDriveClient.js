// Thin fetch-based wrapper over Drive API v3, scoped to the appDataFolder
// space — no googleapis SDK dependency, same "zero new npm dependency"
// approach already used by settingsCrypto.js for Web Crypto.
//
// Filename-parameterized (not hardcoded to one file) — settings and the
// workspace (tasks/projects) sync to two separate files in appDataFolder,
// see googleDriveSync.js and workspace/workspaceDriveSync.js. Two files
// instead of one keeps the domains isolated: a bug in one sync path can't
// corrupt the other's data, and a task drag doesn't rewrite the whole
// settings blob.

export const SETTINGS_FILE_NAME = 'canvastools-preferences.json';
export const WORKSPACE_FILE_NAME = 'canvastools-workspace.json';

async function driveFetch(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Falha na comunicação com o Google Drive (HTTP ${response.status}): ${text}`);
  }
  return response;
}

/** Locates a file by name inside appDataFolder — used both for the first
 * sync and as a fallback when a locally-cached fileId is missing or stale
 * (never depend solely on the local fileId). */
export async function findDriveFile(accessToken, fileName) {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${fileName}' and trashed=false`,
    fields: 'files(id,modifiedTime)',
  });
  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  return data.files?.[0] || null;
}

export async function createDriveFile(accessToken, fileName, fileBody) {
  const boundary = `canvastools-${crypto.randomUUID()}`;
  const metadata = { name: fileName, parents: ['appDataFolder'] };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n${JSON.stringify(fileBody)}\r\n` +
    `--${boundary}--`;

  const response = await driveFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  return response.json();
}

export async function downloadDriveFile(accessToken, fileId) {
  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.json();
}

export async function updateDriveFile(accessToken, fileId, fileBody) {
  await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(fileBody),
  });
}
