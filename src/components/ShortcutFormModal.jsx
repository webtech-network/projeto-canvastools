'use client';

import { useState } from 'react';
import Modal from './Modal';
import { saveShortcut } from '@/lib/shortcuts';
import { SHORTCUT_ICONS, DEFAULT_SHORTCUT_ICON_ID } from '@/lib/shortcutIcons';

// Doubles as create and edit (same pattern as ProjectFormModal.jsx) — pass
// `shortcut` to edit an existing one, omit it to create a new one. Replaces
// the old always-open inline form in ShortcutsManager.jsx: the add/edit
// surface only exists while this modal is open, triggered by the single
// "Adicionar" button (list) or a row's "Editar" button.
export default function ShortcutFormModal({ shortcut = null, onClose, onSaved }) {
  const isEditing = Boolean(shortcut);

  const [label, setLabel] = useState(shortcut?.label || '');
  const [url, setUrl] = useState(shortcut?.url || '');
  const [icon, setIcon] = useState(shortcut?.icon || DEFAULT_SHORTCUT_ICON_ID);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const dirty = isEditing
    ? label !== shortcut.label || url !== shortcut.url || icon !== (shortcut.icon || DEFAULT_SHORTCUT_ICON_ID)
    : label.trim().length > 0 || url.trim().length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;
      await saveShortcut({ id: shortcut?.id || null, label: label.trim(), url: finalUrl, icon });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEditing ? 'Editar atalho' : 'Novo atalho'} onClose={onClose} preventBackdropClose={dirty}>
      <form onSubmit={handleSubmit}>
        <label className="compose-message-field">
          <span>Nome</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nome do atalho"
            aria-label="Nome do atalho"
          />
        </label>

        <label className="compose-message-field">
          <span>URL</span>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (ex.: https://exemplo.com)"
            aria-label="URL do atalho"
          />
        </label>

        <label className="compose-message-field">
          <span>Ícone</span>
          <div className="shortcuts-icon-picker" role="radiogroup" aria-label="Ícone do atalho">
            {SHORTCUT_ICONS.map(({ id, label: iconLabel, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={icon === id}
                className={`shortcut-icon-swatch${icon === id ? ' active' : ''}`}
                onClick={() => setIcon(id)}
                title={iconLabel}
                aria-label={iconLabel}
              >
                <Icon size={16} strokeWidth={1.8} />
              </button>
            ))}
          </div>
        </label>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <div className="compose-message-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !label.trim() || !url.trim()}>
            {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
