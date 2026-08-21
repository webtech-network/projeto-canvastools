import { useCallback, useEffect, useState } from 'react';
import { dbGetAll, dbPut, dbDelete, STORE_SHORTCUTS } from './indexedDb';
import { DEFAULT_SHORTCUT_ICON_ID } from './shortcutIcons';

const EXPORT_KIND = 'shortcuts-export';
const EXPORT_VERSION = 1;

export async function listShortcuts() {
  const rows = await dbGetAll(STORE_SHORTCUTS);
  return rows.sort((a, b) => a.order - b.order);
}

export async function saveShortcut({ id, label, url, icon }) {
  const shortcuts = await listShortcuts();
  const existing = id ? shortcuts.find((s) => s.id === id) : null;
  const record = {
    id: id || crypto.randomUUID(),
    label,
    url,
    icon: icon || existing?.icon || DEFAULT_SHORTCUT_ICON_ID,
    order: existing?.order ?? shortcuts.length,
    createdAt: existing?.createdAt ?? Date.now(),
  };
  await dbPut(STORE_SHORTCUTS, record);
  return record;
}

export async function deleteShortcut(id) {
  await dbDelete(STORE_SHORTCUTS, id);
}

// Rewrites the `order` field for every shortcut to match `orderedIds`' index
// — no drag library, just up/down buttons in ShortcutsManager reordering an
// array and calling this.
export async function reorderShortcuts(orderedIds) {
  const shortcuts = await listShortcuts();
  const byId = new Map(shortcuts.map((s) => [s.id, s]));
  await Promise.all(
    orderedIds.map((id, index) => {
      const shortcut = byId.get(id);
      return shortcut ? dbPut(STORE_SHORTCUTS, { ...shortcut, order: index }) : null;
    }),
  );
}

// Same Blob + object-URL + programmatic <a download> pattern as
// QuestionGenerator.jsx's handleSaveFile.
export async function exportShortcutsFile() {
  const shortcuts = await listShortcuts();
  const payload = {
    app: 'canvastools',
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    shortcuts: shortcuts.map(({ id, label, url, icon, order }) => ({ id, label, url, icon, order })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `canvastools-atalhos-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Replace, not merge — imported ids come from a different browser's
// crypto.randomUUID() sequence, so merging risks silent id collisions.
// Callers (importShortcutsFromFile below, and settingsExport.js's combined
// import) are expected to confirm with the user before calling this, since
// it destroys the current shortcut list.
export async function replaceAllShortcuts(shortcutsArray) {
  const existing = await listShortcuts();
  await Promise.all(existing.map((s) => dbDelete(STORE_SHORTCUTS, s.id)));
  await Promise.all(
    shortcutsArray.map((s, index) =>
      dbPut(STORE_SHORTCUTS, {
        id: typeof s.id === 'string' && s.id ? s.id : crypto.randomUUID(),
        label: s.label || '',
        url: s.url || '',
        icon: s.icon || DEFAULT_SHORTCUT_ICON_ID,
        order: Number.isInteger(s.order) ? s.order : index,
        createdAt: Date.now(),
      }),
    ),
  );
  return shortcutsArray.length;
}

export async function importShortcutsFromFile(file) {
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Arquivo inválido: não é um JSON válido.');
  }
  if (payload?.kind !== EXPORT_KIND || !Array.isArray(payload.shortcuts)) {
    throw new Error('Arquivo inválido: não é um export de atalhos do CanvasTools.');
  }
  return replaceAllShortcuts(payload.shortcuts);
}

// Client-component hook: local state mirroring the IndexedDB store, with a
// refresh() callers invoke after any mutation (save/delete/reorder/import).
export function useShortcuts() {
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setShortcuts(await listShortcuts());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { shortcuts, loading, refresh };
}
