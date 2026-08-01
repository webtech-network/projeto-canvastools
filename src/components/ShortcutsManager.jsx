'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { saveShortcut, deleteShortcut, reorderShortcuts, useShortcuts } from '@/lib/shortcuts';

function emptyForm() {
  return { id: null, label: '', url: '' };
}

// Full CRUD editor for the personal shortcuts shown on the dashboard
// (DashboardShortcuts.jsx) — everything here reads/writes IndexedDB
// directly via src/lib/shortcuts.js, no server round-trip, since shortcuts
// are a pure per-browser preference. `onDirtyChange` (optional) reports
// whether the add/edit form has unsaved text, for ProfileTabs' leave-page
// warning.
export default function ShortcutsManager({ onDirtyChange }) {
  const { shortcuts, loading, refresh } = useShortcuts();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const editing = Boolean(form.id);
  const isDirty = form.label.trim().length > 0 || form.url.trim().length > 0;
  // Deliberately depends only on `isDirty` — see ApiKeyManager.jsx's own
  // effect for why `onDirtyChange` itself isn't in the dependency array.
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.label.trim() || !form.url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let url = form.url.trim();
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      await saveShortcut({ id: form.id, label: form.label.trim(), url });
      setForm(emptyForm());
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(shortcut) {
    setForm({ id: shortcut.id, label: shortcut.label, url: shortcut.url });
  }

  async function handleDelete(id) {
    await deleteShortcut(id);
    if (form.id === id) setForm(emptyForm());
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
      <form onSubmit={handleSubmit} className="shortcuts-form">
        <input
          type="text"
          placeholder="Nome do atalho"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          aria-label="Nome do atalho"
        />
        <input
          type="text"
          placeholder="URL (ex.: https://exemplo.com)"
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          aria-label="URL do atalho"
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {editing ? 'Salvar' : '+ Adicionar'}
        </button>
        {editing && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(emptyForm())}>
            Cancelar
          </button>
        )}
      </form>

      {error && <p className="alert alert-error">{error}</p>}

      {loading ? (
        <p className="lede">Carregando…</p>
      ) : shortcuts.length === 0 ? (
        <p className="lede">Nenhum atalho cadastrado ainda.</p>
      ) : (
        <ul className="shortcuts-list">
          {shortcuts.map((s, i) => (
            <li key={s.id} className="shortcuts-list-item">
              <div>
                <span className="card-title">{s.label}</span>
                <span className="card-meta">{s.url}</span>
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
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleEdit(s)}>
                  Editar
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)}>
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="lede">
        Os atalhos ficam salvos só neste navegador (IndexedDB) — use "Exportar/Importar configurações" no topo da
        página para levá-los a outro navegador ou computador.
      </p>
    </div>
  );
}
