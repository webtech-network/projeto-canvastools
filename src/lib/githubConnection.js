import { dbGet, dbPut, dbDelete, STORE_GITHUB } from './indexedDb';

const CONNECTION_ID = 'connection';

export async function getGithubConnection() {
  return (await dbGet(STORE_GITHUB, CONNECTION_ID)) || null;
}

export async function saveGithubConnection({ login, avatarUrl, accessToken, scopes, name }) {
  const record = { id: CONNECTION_ID, login, avatarUrl, accessToken, scopes: scopes || '', name: name || null, connectedAt: Date.now() };
  await dbPut(STORE_GITHUB, record);
  return record;
}

export async function clearGithubConnection() {
  await dbDelete(STORE_GITHUB, CONNECTION_ID);
}
