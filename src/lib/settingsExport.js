import { listShortcuts, replaceAllShortcuts } from './shortcuts';
import { getAllCustomPrompts, saveCustomPrompt } from './customPrompts';
import { encryptJson, decryptJson } from './settingsCrypto';

const EXPORT_KIND = 'settings-export';
const EXPORT_VERSION = 1;

async function fetchConfiguredKeys() {
  const response = await fetch('/api/ai/keys');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao buscar as chaves de API para exportação.');
  return data.keys;
}

// `includeKeys` requires `password` — the whole bundle (not just the keys
// portion) gets encrypted in that case, so the file is either fully plain
// JSON (shortcuts + custom prompts only) or fully ciphertext, never a mix.
export async function exportSettingsFile({ includeKeys, password }) {
  const shortcuts = await listShortcuts();
  const customPrompts = await getAllCustomPrompts();

  const payload = {
    shortcuts: shortcuts.map(({ id, label, url, order }) => ({ id, label, url, order })),
    customPrompts: customPrompts.map(({ capability, text, mode }) => ({ capability, text, mode })),
  };

  let fileBody;
  if (includeKeys) {
    if (!password) throw new Error('Defina uma senha para cifrar o arquivo.');
    payload.apiKeys = await fetchConfiguredKeys();
    const encrypted = await encryptJson(payload, password);
    fileBody = {
      app: 'canvastools',
      kind: EXPORT_KIND,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      encrypted: true,
      ...encrypted,
    };
  } else {
    fileBody = {
      app: 'canvastools',
      kind: EXPORT_KIND,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      encrypted: false,
      payload,
    };
  }

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
// overwrites shortcuts, custom prompts, and (if present) AI API keys.
export async function importSettingsFromFile(file, { password } = {}) {
  const text = await file.text();
  let fileBody;
  try {
    fileBody = JSON.parse(text);
  } catch {
    throw new Error('Arquivo inválido: não é um JSON válido.');
  }
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

  const results = { shortcuts: 0, customPrompts: 0, apiKeys: 0 };

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

  return results;
}
