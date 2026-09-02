'use client';

import { useState } from 'react';
import Modal from './Modal';
import WorkspaceMultiSelect from './WorkspaceMultiSelect';
import { useWorkspaceScope } from './WorkspaceScopeProvider';

// Generic association modal for any resource type that doesn't have its own
// dedicated form (Canvas courses today; any future resource type mentioned
// in the original request tomorrow) — parameterized entirely by
// resourceType/resourceId/title rather than one modal per resource type.
// ProjectFormModal.jsx uses WorkspaceMultiSelect inline instead of this,
// since it already has its own form to embed the field in.
export default function ResourceWorkspacesModal({ resourceType, resourceId, title, onClose }) {
  const { getWorkspaceIdsForResource, setResourceWorkspaces } = useWorkspaceScope();
  const [selectedIds, setSelectedIds] = useState(() => getWorkspaceIdsForResource(resourceType, resourceId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await setResourceWorkspaces(resourceType, resourceId, selectedIds);
      onClose();
    } catch (err) {
      setError(err.message || 'Falha ao salvar os workspaces.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="field-note">Selecione a quais workspaces este item pertence. Ele também aparece sempre no workspace Base.</p>
      <WorkspaceMultiSelect selectedIds={selectedIds} onChange={setSelectedIds} />

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="compose-message-actions">
        <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </Modal>
  );
}
