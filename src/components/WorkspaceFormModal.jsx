'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import Modal from './Modal';
import { useWorkspaceScope } from './WorkspaceScopeProvider';
import { PROJECT_COLORS } from '@/lib/tasks/projectColors';

// Doubles as create and edit — `workspace` (optional) pre-fills the form and
// switches the submit action to editWorkspace instead of addWorkspace. Same
// shape as ProjectFormModal.jsx, reusing the same color palette (see
// projectColors.js — it's a generic 16-hue palette despite the filename).
export default function WorkspaceFormModal({ workspace = null, onClose }) {
  const { addWorkspace, editWorkspace } = useWorkspaceScope();
  const isEditing = Boolean(workspace);

  const [name, setName] = useState(workspace?.name || '');
  const [color, setColor] = useState(workspace?.color || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), color };
      if (isEditing) {
        await editWorkspace(workspace.id, payload);
      } else {
        await addWorkspace(payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Falha ao salvar o workspace.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEditing ? 'Editar workspace' : 'Novo workspace'}
      onClose={onClose}
      preventBackdropClose={Boolean(name.trim())}
    >
      <form onSubmit={handleSubmit}>
        <label className="compose-message-field">
          <span>Nome</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do workspace" />
        </label>

        <label className="compose-message-field">
          <span>Cor</span>
          <div className="project-color-picker" role="radiogroup" aria-label="Cor do workspace">
            <button
              type="button"
              className={`project-color-swatch project-color-swatch--none${color === null ? ' active' : ''}`}
              onClick={() => setColor(null)}
              title="Sem cor"
              aria-label="Sem cor"
              role="radio"
              aria-checked={color === null}
            >
              {color === null && <Check size={14} strokeWidth={2.4} />}
            </button>
            {PROJECT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`project-color-swatch${color === c.hex ? ' active' : ''}`}
                style={{ backgroundColor: c.hex }}
                onClick={() => setColor(c.hex)}
                title={c.label}
                aria-label={c.label}
                role="radio"
                aria-checked={color === c.hex}
              >
                {color === c.hex && <Check size={14} strokeWidth={2.4} color="#fff" />}
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
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
            {saving ? 'Salvando…' : isEditing ? 'Salvar workspace' : 'Criar workspace'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
