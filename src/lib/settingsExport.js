import { listShortcuts, replaceAllShortcuts } from './shortcuts';
import { getAllCustomPrompts, saveCustomPrompt } from './customPrompts';
import { getGithubConnection, saveGithubConnection } from './githubConnection';
import { encryptJson, decryptJson } from './settingsCrypto';

const EXPORT_KIND = 'settings-export';
const EXPORT_VERSION = 1;

async function fetchConfiguredKeys() {
  const response = await fetch('/api/ai/keys');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao buscar as chaves de API para exportação.');
  return data.keys;
}

// Not gated behind `includeSecrets` — a model preference (e.g. "gpt-4o") is
// just a string, not a credential, so it's safe to carry in the plain
// (unencrypted) export too. See src/app/api/ai/models/route.js's own
// comment for the same reasoning server-side.
async function fetchConfiguredModels() {
  const response = await fetch('/api/ai/models');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao buscar os modelos configurados para exportação.');
  return data.models;
}

// `includeSecrets` requires `password` — the whole bundle (not just the
// sensitive portion) gets encrypted in that case, so the file is either
// fully plain JSON (shortcuts + custom prompts only) or fully ciphertext,
// never a mix. "Secrets" here covers both AI API keys and the GitHub
// connection's access token — both live client-side already (session for
// AI keys is server-only by default, exposed only via this deliberate
// export path; the GitHub token lives in IndexedDB already, see
// githubConnection.js) and both are meaningless/dangerous to leave in a
// plaintext file.
//
// Extracted from exportSettingsFile() (kept as a thin wrapper below) so
// googleDriveSync.js can build the exact same envelope without going
// through a Blob/download side effect.
export async function buildSettingsPayload({ includeSecrets, password }) {
  const shortcuts = await listShortcuts();
  const customPrompts = await getAllCustomPrompts();

  const aiModels = await fetchConfiguredModels();

  const payload = {
    shortcuts: shortcuts.map(({ id, label, url, order }) => ({ id, label, url, order })),
    customPrompts: customPrompts.map(({ capability, text, mode }) => ({ capability, text, mode })),
    ...(aiModels && Object.keys(aiModels).length ? { aiModels } : {}),
  };

  if (includeSecrets) {
    if (!password) throw new Error('Defina uma senha para cifrar o arquivo.');
    payload.apiKeys = await fetchConfiguredKeys();
    const github = await getGithubConnection();
    if (github) payload.github = github;
    const encrypted = await encryptJson(payload, password);
    return {
      app: 'canvastools',
      kind: EXPORT_KIND,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      encrypted: true,
      ...encrypted,
    };
  }

  return {
    app: 'canvastools',
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    encrypted: false,
    payload,
  };
}

export async function exportSettingsFile({ includeSecrets, password }) {
  const fileBody = await buildSettingsPayload({ includeSecrets, password });

  const blob = new Blob([JSON.stringify(fileBody, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `canvastools-configuracoes-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Replace, not merge (same reasoning as shortcuts.js's own import) — callers
// are expected to confirm with the user before calling this, since it
// overwrites shortcuts, custom prompts, and (if present) AI API keys and the
// GitHub connection.
//
// Extracted from importSettingsFromFile() (kept as a thin wrapper below) so
// googleDriveSync.js can apply a fileBody fetched from Drive without going
// through a File/FileReader side effect.
export async function applySettingsPayload(fileBody, { password } = {}) {
  if (fileBody?.kind !== EXPORT_KIND) {
    throw new Error('Arquivo inválido: não é um export de configurações do CanvasTools.');
  }

  let payload;
  if (fileBody.encrypted) {
    if (!password) throw new Error('Este arquivo é cifrado — informe a senha.');
    payload = await decryptJson(fileBody, password);
  } else {
    payload = fileBody.payload || {};
  }

  const results = { shortcuts: 0, customPrompts: 0, apiKeys: 0, github: 0, aiModels: 0 };

  if (Array.isArray(payload.shortcuts)) {
    results.shortcuts = await replaceAllShortcuts(payload.shortcuts);
  }

  if (Array.isArray(payload.customPrompts)) {
    for (const entry of payload.customPrompts) {
      if (!entry?.capability || !entry?.text) continue;
      await saveCustomPrompt(entry.capability, { text: entry.text, mode: entry.mode });
      results.customPrompts += 1;
    }
  }

  if (payload.apiKeys && typeof payload.apiKeys === 'object') {
    for (const [providerId, apiKey] of Object.entries(payload.apiKeys)) {
      if (!apiKey) continue;
      const response = await fetch(`/api/ai/${providerId}/key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      if (response.ok) results.apiKeys += 1;
    }
  }

  if (payload.github && payload.github.accessToken) {
    await saveGithubConnection(payload.github);
    results.github = 1;
  }

  if (payload.aiModels && typeof payload.aiModels === 'object') {
    for (const [providerId, model] of Object.entries(payload.aiModels)) {
      if (!model) continue;
      const response = await fetch(`/api/ai/${providerId}/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      if (response.ok) results.aiModels += 1;
    }
  }

  return results;
}

export async function importSettingsFromFile(file, { password } = {}) {
  const text = await file.text();
  let fileBody;
  try {
    fileBody = JSON.parse(text);
  } catch {
    throw new Error('Arquivo inválido: não é um JSON válido.');
  }
  return applySettingsPayload(fileBody, { password });
}
