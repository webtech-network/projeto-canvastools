'use client';

import { useWorkspaceScope } from './WorkspaceScopeProvider';

// Plain checkbox list over every real workspace (Base excluded — it's
// implicit and can't be toggled, every resource already belongs to it).
// Used inline by ProjectFormModal.jsx and inside ResourceWorkspacesModal.jsx
// for resource types (like Canvas courses) that don't have their own form.
export default function WorkspaceMultiSelect({ selectedIds, onChange }) {
  const { workspaces } = useWorkspaceScope();
  const assignable = workspaces.filter((w) => !w.isBase);

  if (assignable.length === 0) {
    return <p className="field-note">Nenhum workspace criado ainda — todo item pertence ao workspace Base por padrão.</p>;
  }

  function toggle(id) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((w) => w !== id) : [...selectedIds, id]);
  }

  return (
    <ul className="workspace-multiselect-list">
      {assignable.map((workspace) => (
        <li key={workspace.id} className="workspace-multiselect-row">
          <label className="task-detail-checkbox">
            <input type="checkbox" checked={selectedIds.includes(workspace.id)} onChange={() => toggle(workspace.id)} />
            <span
              className="tasks-projects-color-dot"
              style={{ backgroundColor: workspace.color || 'transparent' }}
              aria-hidden="true"
            />
            {workspace.name}
          </label>
        </li>
      ))}
    </ul>
  );
}
