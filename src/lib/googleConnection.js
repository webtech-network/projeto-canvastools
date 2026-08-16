import { dbGet, dbPut, dbDelete, STORE_GOOGLE } from './indexedDb';

const CONNECTION_ID = 'connection';

// Same safety margin used by src/proxy.js for the Canvas access token —
// refresh a bit before actual expiry rather than waiting for a 401, since
// there's no server-side retry hook for direct browser->Drive API calls
// the way canvasClient.js's onUnauthorized covers Canvas calls.
const REFRESH_SAFETY_MARGIN_MS = 5 * 60 * 1000;

export async function getGoogleConnection() {
  return (await dbGet(STORE_GOOGLE, CONNECTION_ID)) || null;
}

export async function saveGoogleConnection(fields) {
  const existing = await getGoogleConnection();
  const record = {
    id: CONNECTION_ID,
    email: fields.email ?? existing?.email ?? null,
    name: fields.name ?? existing?.name ?? null,
    photoLink: fields.photoLink ?? existing?.photoLink ?? null,
    accessToken: fields.accessToken ?? existing?.accessToken,
    refreshToken: fields.refreshToken ?? existing?.refreshToken,
    expiresAt: fields.expiresAt ?? existing?.expiresAt,
    connectedAt: existing?.connectedAt ?? Date.now(),
    fileId: fields.fileId !== undefined ? fields.fileId : existing?.fileId,
    lastSuccessfulSyncAt: fields.lastSuccessfulSyncAt !== undefined ? fields.lastSuccessfulSyncAt : existing?.lastSuccessfulSyncAt,
  };
  await dbPut(STORE_GOOGLE, record);
  return record;
}

export async function clearGoogleConnection() {
  await dbDelete(STORE_GOOGLE, CONNECTION_ID);
}

/**
 * Returns an access token guaranteed usable right now, transparently
 * refreshing (and persisting the refreshed token back to IndexedDB) via
 * /api/google/refresh when the stored one is missing or close to expiry.
 * The refresh_token never leaves this call except to that one route, which
 * is a stateless pass-through — see src/app/api/google/refresh/route.js.
 */
export async function getValidAccessToken() {
  const connection = await getGoogleConnection();
  if (!connection?.accessToken || !connection?.refreshToken) {
    throw new Error('Google Drive não está conectado.');
  }

  const expiringSoon = !connection.expiresAt || connection.expiresAt - Date.now() < REFRESH_SAFETY_MARGIN_MS;
  if (!expiringSoon) {
    return connection.accessToken;
  }

  const response = await fetch('/api/google/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: connection.refreshToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao renovar a conexão com o Google Drive. Reconecte em /perfil.');
  }

  await saveGoogleConnection({ accessToken: data.accessToken, expiresAt: data.expiresAt });
  return data.accessToken;
}
