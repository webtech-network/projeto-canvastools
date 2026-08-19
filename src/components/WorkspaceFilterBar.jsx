'use client';

import { useMemo } from 'react';
import { useWorkspace } from './WorkspaceProvider';
import { EMPTY_FILTERS } from '@/lib/workspace/filters';
import { STATUSES } from '@/lib/workspace/tasksRepo';
import { STATUS_META } from '@/lib/workspace/statusMeta';

// Filters live in WorkspaceProvider's reducer (not local state here) — that
// alone is what makes switching between Kanban/Eisenhower preserve the
// active filters (spec section 9), with no extra hand-off logic needed.
export default function WorkspaceFilterBar() {
  const { tasks, projects, filters, setFilters } = useWorkspace();

  const allTags = useMemo(() => {
    const tags = new Set();
    for (const task of tasks) for (const tag of task.tags || []) tags.add(tag);
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => value !== EMPTY_FILTERS[key] && value !== null && value !== '',
  );

  return (
    <div className="workspace-filter-bar">
      <select
        aria-label="Filtrar por projeto"
        value={filters.projectId || ''}
        onChange={(e) => setFilters({ projectId: e.target.value || null })}
      >
        <option value="">Todos os projetos</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por tag"
        value={filters.tag || ''}
        onChange={(e) => setFilters({ tag: e.target.value || null })}
      >
        <option value="">Todas as tags</option>
        {allTags.map((tag) => (
          <option key={tag} value={tag}>
            #{tag}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por status"
        value={filters.status || ''}
        onChange={(e) => setFilters({ status: e.target.value || null })}
      >
        <option value="">Todos os status</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>

      <input
        type="date"
        aria-label="Prazo até"
        value={filters.dueBefore || ''}
        onChange={(e) => setFilters({ dueBefore: e.target.value || null })}
      />

      <label className="task-detail-checkbox">
        <input
          type="checkbox"
          checked={filters.urgent === true}
          onChange={(e) => setFilters({ urgent: e.target.checked ? true : null })}
        />
        Urgente
      </label>
      <label className="task-detail-checkbox">
        <input
          type="checkbox"
          checked={filters.important === true}
          onChange={(e) => setFilters({ important: e.target.checked ? true : null })}
        />
        Importante
      </label>

      {hasActiveFilters && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilters(EMPTY_FILTERS)}>
          Limpar filtros
        </button>
      )}
    </div>
  );
}
