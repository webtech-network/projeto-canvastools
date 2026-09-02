'use client';

import { useState } from 'react';
import { Pencil, Trash2, Plus, Link2 } from 'lucide-react';
import Modal from './Modal';
import WorkspaceFormModal from './WorkspaceFormModal';
import WorkspaceResourcesModal from './WorkspaceResourcesModal';
import { useWorkspaceScope } from './WorkspaceScopeProvider';

// Mirrors ProjectsManagerModal.jsx's shape: view + maintain every registered
// workspace, edit/delete per row, creation reuses the same
// WorkspaceFormModal.jsx the switcher's own "+ Novo workspace" opens. The
// Base workspace (always first in `workspaces`, see WorkspaceScopeProvider)
// gets no row here — it isn't a real record and can't be edited or deleted.
export default function WorkspaceManagerModal({ onClose }) {
  const { workspaces, links, removeWorkspace } = useWorkspaceScope();
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [managingResourcesFor, setManagingResourcesFor] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const editableWorkspaces = workspaces.filter((w) => !w.isBase);

  function linkCountFor(workspaceId) {
    return links.filter((l) => l.workspaceId === workspaceId).length;
  }

  async function handleDelete(workspace) {
    const count = linkCountFor(workspace.id);
    const warning =
      count > 0
        ? ` ${count} item${count > 1 ? 's' : ''} vinculado${count > 1 ? 's' : ''} a ele deixará${count > 1 ? 'ão' : ''} de aparecer neste workspace (o item em si não é apagado).`
        : '';
    if (!window.confirm(`Excluir o workspace "${workspace.name}"?${warning}`)) return;
    setDeletingId(workspace.id);
    try {
      await removeWorkspace(workspace.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Modal title="Workspaces" onClose={onClose}>
        {editableWorkspaces.length === 0 ? (
          <p className="lede">Nenhum workspace criado ainda.</p>
        ) : (
          <div className="tasks-projects-group">
            <ul className="tasks-projects-list">
              {editableWorkspaces.map((workspace) => (
                <li key={workspace.id} className="tasks-projects-row">
                  <span
                    className="tasks-projects-color-dot"
                    style={{ backgroundColor: workspace.color || 'transparent' }}
                    aria-hidden="true"
                  />
                  <span className="tasks-projects-name">{workspace.name}</span>
                  <span className="tasks-projects-count">{linkCountFor(workspace.id)} item(ns)</span>
                  <span className="tasks-projects-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      title="Associar projetos e cursos"
                      aria-label={`Associar projetos e cursos ao workspace ${workspace.name}`}
                      onClick={() => setManagingResourcesFor(workspace)}
                    >
                      <Link2 size={14} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      title="Editar workspace"
                      aria-label={`Editar workspace ${workspace.name}`}
                      onClick={() => setEditingWorkspace(workspace)}
                    >
                      <Pencil size={14} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon btn-sm"
                      title="Excluir workspace"
                      aria-label={`Excluir workspace ${workspace.name}`}
                      disabled={deletingId === workspace.id}
                      onClick={() => handleDelete(workspace)}
                    >
                      <Trash2 size={14} strokeWidth={1.8} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="compose-message-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Plus size={15} strokeWidth={1.8} />
            Novo workspace
          </button>
        </div>
      </Modal>

      {creating && <WorkspaceFormModal onClose={() => setCreating(false)} />}
      {editingWorkspace && <WorkspaceFormModal workspace={editingWorkspace} onClose={() => setEditingWorkspace(null)} />}
      {managingResourcesFor && (
        <WorkspaceResourcesModal workspace={managingResourcesFor} onClose={() => setManagingResourcesFor(null)} />
      )}
    </>
  );
}
