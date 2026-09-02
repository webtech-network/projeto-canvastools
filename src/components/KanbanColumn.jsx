'use client';

import { X } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';
import { groupTasksByProject } from '@/lib/tasks/grouping';

// `collapsed` (per column, toggled either from this column's own close
// button below or from TasksView.jsx's Backlog/Block toolbar shortcut)
// shrinks the column to a narrow strip showing only its count + label — the
// droppable stays active even collapsed, so a card can still be dragged
// straight into a closed column without expanding it first. Clicking the
// collapsed strip (via `onExpand`) is the way back to the normal view.
export default function KanbanColumn({
  status,
  label,
  Icon,
  tasks,
  projects,
  groupByProject,
  onSelect,
  collapsed,
  onCollapse,
  onExpand,
  onCreate,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  // Only fires when the double-click landed on the body wrapper itself, not
  // bubbled up from a TaskCard inside it (cards have their own single-click
  // onSelect) — "fora dos cards" (outside the cards).
  function handleBodyDoubleClick(e) {
    if (e.target === e.currentTarget) onCreate(status);
  }

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column${isOver ? ' kanban-column--over' : ''}${collapsed ? ' kanban-column--collapsed' : ''}`}
    >
      {collapsed ? (
        <button
          type="button"
          className="kanban-column-collapsed-label"
          onClick={onExpand}
          title={`Expandir coluna ${label}`}
          aria-label={`Expandir coluna ${label}`}
        >
          <span className="pending-badge">{tasks.length}</span>
          <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
          <span className="kanban-column-collapsed-name">{label}</span>
        </button>
      ) : (
        <>
          <div className="kanban-column-header">
            <span className="kanban-column-title">
              <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
              {label}
            </span>
            <span className="kanban-column-header-right">
              <span className="pending-badge">{tasks.length}</span>
              <button
                type="button"
                className="kanban-column-close-btn"
                onClick={onCollapse}
                title={`Fechar coluna ${label}`}
                aria-label={`Fechar coluna ${label}`}
              >
                <X size={14} strokeWidth={1.8} />
              </button>
            </span>
          </div>
          <div
            className="kanban-column-body"
            onDoubleClick={handleBodyDoubleClick}
            title="Duplo clique para criar uma tarefa neste estágio"
          >
            {groupByProject
              ? groupTasksByProject(tasks, projects).map(({ project, tasks: groupTasks }) => (
                  <div key={project?.id || 'none'} className="task-group">
                    <div className="task-group-header">
                      <span
                        className="tasks-projects-color-dot"
                        style={{ backgroundColor: project?.color || 'transparent' }}
                      />
                      <span className="task-group-name">{project ? project.name : 'Sem projeto'}</span>
                      <span className="pending-badge">{groupTasks.length}</span>
                    </div>
                    {groupTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onSelect={onSelect} />
                    ))}
                  </div>
                ))
              : tasks.map((task) => <TaskCard key={task.id} task={task} onSelect={onSelect} />)}
          </div>
        </>
      )}
    </div>
  );
}
