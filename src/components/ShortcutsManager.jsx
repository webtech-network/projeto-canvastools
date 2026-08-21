'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import { saveShortcut, deleteShortcut, reorderShortcuts, useShortcuts } from '@/lib/shortcuts';
import { SHORTCUT_ICONS, DEFAULT_SHORTCUT_ICON_ID, getShortcutIcon } from '@/lib/shortcutIcons';

function emptyForm() {
  return { id: null, label: '', url: '', icon: DEFAULT_SHORTCUT_ICON_ID };
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
      await saveShortcut({ id: form.id, label: form.label.trim(), url, icon: form.icon });
      setForm(emptyForm());
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(shortcut) {
    setForm({
      id: shortcut.id,
      label: shortcut.label,
      url: shortcut.url,
      icon: shortcut.icon || DEFAULT_SHORTCUT_ICON_ID,
    });
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
        <div className="shortcuts-icon-picker" role="radiogroup" aria-label="Ícone do atalho">
          {SHORTCUT_ICONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={form.icon === id}
              className={`shortcut-icon-swatch${form.icon === id ? ' active' : ''}`}
              onClick={() => setForm((f) => ({ ...f, icon: id }))}
              title={label}
              aria-label={label}
            >
              <Icon size={16} strokeWidth={1.8} />
            </button>
          ))}
        </div>
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
                  onClick={() => handleEdit(s)}
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
    </div>
  );
}
