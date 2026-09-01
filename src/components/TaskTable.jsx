'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Flag, Zap } from 'lucide-react';
import { useWorkspace } from './WorkspaceProvider';
import { applyFilters } from '@/lib/workspace/filters';
import { comparePriority } from '@/lib/workspace/taskSort';
import { groupTasksByProject } from '@/lib/workspace/grouping';
import { formatDueDate, isPastDue } from '@/lib/workspace/dueDate';
import { STATUSES } from '@/lib/workspace/tasksRepo';
import { STATUS_META } from '@/lib/workspace/statusMeta';

// Every sortable column but "Prioridade" needs its own comparator; that one
// reuses taskSort.js's comparePriority (same rank → urgência → importância
// tie-break as the Kanban/Matriz views) so the table's default order matches
// theirs. `projectsById` is only needed by the 'project' column, resolving a
// task's project name the same way TaskCard.jsx/KanbanColumn.jsx do.
function buildComparator(sortKey, projectsById) {
  switch (sortKey) {
    case 'project':
      return (a, b) => {
        const nameA = a.projectId && projectsById.has(a.projectId) ? projectsById.get(a.projectId).name : 'Sem projeto';
        const nameB = b.projectId && projectsById.has(b.projectId) ? projectsById.get(b.projectId).name : 'Sem projeto';
        return nameA.localeCompare(nameB);
      };
    case 'title':
      return (a, b) => a.title.localeCompare(b.title);
    case 'status':
      return (a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
    case 'important':
      return (a, b) => (a.priority?.important ? 1 : 0) - (b.priority?.important ? 1 : 0);
    case 'urgent':
      return (a, b) => (a.priority?.urgent ? 1 : 0) - (b.priority?.urgent ? 1 : 0);
    case 'dueDate':
      return (a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      };
    case 'priorityRank':
    default:
      return comparePriority;
  }
}

const COLUMNS = [
  { key: 'priorityRank', label: 'Prioridade' },
  { key: 'project', label: 'Projeto' },
  { key: 'title', label: 'Título' },
  { key: 'status', label: 'Status' },
  { key: 'important', label: 'Importante' },
  { key: 'urgent', label: 'Urgente' },
  { key: 'dueDate', label: 'Prazo' },
];
// Tags round out the row but aren't a sort key — there's no single sensible
// order for a set-valued column.
const TOTAL_COLUMNS = COLUMNS.length + 1;

// Third view alongside Kanban/Matriz (WorkspaceView.jsx) — every non-deleted,
// filtered task in one sortable table instead of split across status columns
// or priority quadrants. Shares the same `groupByProject` toolbar toggle as
// the other two views (grouping.js's groupTasksByProject): grouping clusters
// rows by project, the active column sort still orders tasks *within* each
// group.
export default function TaskTable({ onSelect }) {
  const { tasks, projects, filters, groupByProject } = useWorkspace();
  const [sortKey, setSortKey] = useState('priorityRank');
  const [sortDir, setSortDir] = useState('asc');

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  function handleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = useMemo(() => {
    const filtered = applyFilters(tasks, filters, projects);
    const cmp = buildComparator(sortKey, projectsById);
    const dir = sortDir === 'asc' ? 1 : -1;
    // comparePriority as a secondary key keeps ties (equal titles, same
    // status, both with no due date, …) in a stable, meaningful order
    // instead of whatever order they happened to come out of IndexedDB in.
    return [...filtered].sort((a, b) => dir * cmp(a, b) || comparePriority(a, b));
  }, [tasks, filters, projects, sortKey, sortDir, projectsById]);

  const groups = groupByProject ? groupTasksByProject(sorted, projects) : null;

  function renderRow(task) {
    const StatusIcon = STATUS_META[task.status]?.Icon;
    const project = task.projectId ? projectsById.get(task.projectId) : null;
    const dueDate = formatDueDate(task.dueDate);
    const overdue = isPastDue(task.dueDate, task.status);
    return (
      <tr key={task.id} className="task-table-row" onClick={() => onSelect(task)}>
        <td className="task-table-cell-center">
          <span className="priority-rank-badge">P{task.priorityRank ?? 3}</span>
        </td>
        <td>
          <span className="task-table-project">
            <span
              className="workspace-projects-color-dot"
              style={{ backgroundColor: project?.color || 'transparent' }}
            />
            {project ? project.name : 'Sem projeto'}
          </span>
        </td>
        <td className="task-table-title">{task.title}</td>
        <td className="task-table-cell-center">
          {StatusIcon && (
            <span title={STATUS_META[task.status].label}>
              <StatusIcon size={16} strokeWidth={1.8} />
            </span>
          )}
        </td>
        <td className="task-table-cell-center">
          {task.priority?.important && (
            <span className="kanban-card-flag" title="Importante">
              <Flag size={15} strokeWidth={1.8} />
            </span>
          )}
        </td>
        <td className="task-table-cell-center">
          {task.priority?.urgent && (
            <span className="kanban-card-urgent" title="Urgente">
              <Zap size={15} strokeWidth={1.8} />
            </span>
          )}
        </td>
        <td>
          {dueDate && (
            <span className={`kanban-card-due${overdue ? ' is-past-due' : ''}`} title={overdue ? 'Prazo vencido' : 'Prazo'}>
              {dueDate}
            </span>
          )}
        </td>
        <td>
          {task.tags?.length > 0 && (
            <div className="kanban-card-tags">
              {task.tags.map((tag) => (
                <span key={tag} className="kanban-card-tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="task-table-wrapper">
      <table className="task-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => {
              const active = col.key === sortKey;
              const SortIcon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
              return (
                <th key={col.key}>
                  <button
                    type="button"
                    className={`task-table-sort-btn${active ? ' active' : ''}`}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon size={14} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </th>
              );
            })}
            <th>Tags</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={TOTAL_COLUMNS} className="task-table-empty">
                Nenhuma tarefa encontrada.
              </td>
            </tr>
          )}
          {groups
            ? groups.map(({ project, tasks: groupTasks }) => (
                <Fragment key={`group-${project?.id || 'none'}`}>
                  <tr className="task-table-group-row">
                    <td colSpan={TOTAL_COLUMNS}>
                      <span
                        className="workspace-projects-color-dot"
                        style={{ backgroundColor: project?.color || 'transparent' }}
                      />
                      {project ? project.name : 'Sem projeto'}
                      <span className="pending-badge">{groupTasks.length}</span>
                    </td>
                  </tr>
                  {groupTasks.map(renderRow)}
                </Fragment>
              ))
            : sorted.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
}
