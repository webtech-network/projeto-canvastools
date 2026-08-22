'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus } from 'lucide-react';
import { deleteShortcut, reorderShortcuts, useShortcuts } from '@/lib/shortcuts';
import { getShortcutIcon } from '@/lib/shortcutIcons';
import ShortcutFormModal from './ShortcutFormModal';

// Full CRUD editor for the personal shortcuts shown on the dashboard
// (DashboardShortcuts.jsx) — everything here reads/writes IndexedDB
// directly via src/lib/shortcuts.js, no server round-trip, since shortcuts
// are a pure per-browser preference. Add/edit happens in ShortcutFormModal.jsx
// (opened via the single right-aligned "Adicionar" button, or a row's
// "Editar" button) instead of an always-open inline form — no lingering
// page-level dirty state to report to ProfileTabs' leave-page warning
// anymore, since the modal's own preventBackdropClose already guards
// in-progress edits.
export default function ShortcutsManager() {
  const { shortcuts, loading, refresh } = useShortcuts();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState(null);

  async function handleDelete(id) {
    await deleteShortcut(id);
    await refresh();
  }

  async function handleMove(index, direction) {
    const next = [...shortcuts];
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    await reorderShortcuts(next.map((s) => s.id));
    await refresh();
  }

  return (
    <div className="shortcuts-manager">
      <div className="shortcuts-manager-header">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          <Plus size={15} strokeWidth={1.8} />
          Adicionar
        </button>
      </div>

      {loading ? (
        <p className="lede">Carregando…</p>
      ) : shortcuts.length === 0 ? (
        <p className="lede">Nenhum atalho cadastrado ainda.</p>
      ) : (
        <ul className="shortcuts-list">
          {shortcuts.map((s, i) => {
            const Icon = getShortcutIcon(s.icon);
            return (
              <li key={s.id} className="shortcuts-list-item">
                <div className="shortcuts-list-item-main">
                  <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                  <span>
                    <span className="card-title">{s.label}</span>
                    <span className="card-meta">{s.url}</span>
                  </span>
                </div>
                <div className="shortcuts-list-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleMove(i, -1)}
                    disabled={i === 0}
                    aria-label="Mover para cima"
                  >
                    <ArrowUp size={14} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleMove(i, 1)}
                    disabled={i === shortcuts.length - 1}
                    aria-label="Mover para baixo"
                  >
                    <ArrowDown size={14} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon btn-sm"
                    title="Editar atalho"
                    aria-label={`Editar atalho ${s.label}`}
                    onClick={() => setEditingShortcut(s)}
                  >
                    <Pencil size={14} strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon btn-sm"
                    title="Remover atalho"
                    aria-label={`Remover atalho ${s.label}`}
                    onClick={() => handleDelete(s.id)}
                  >
                    <Trash2 size={14} strokeWidth={1.8} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showAddModal && <ShortcutFormModal onClose={() => setShowAddModal(false)} onSaved={refresh} />}
      {editingShortcut && (
        <ShortcutFormModal
          shortcut={editingShortcut}
          onClose={() => setEditingShortcut(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
