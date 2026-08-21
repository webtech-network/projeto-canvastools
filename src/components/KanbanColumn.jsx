'use client';

import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';

// `collapsed` (Backlog/Block, toggled from WorkspaceView.jsx) shrinks the
// column to a narrow strip showing only its count + label — the droppable
// stays active even collapsed, so a card can still be dragged straight into
// Backlog/Block without expanding it first. Clicking the collapsed strip
// (via `onExpand`) is a second way to reveal it, alongside the shared toggle
// button in WorkspaceView.jsx.
export default function KanbanColumn({ status, label, Icon, tasks, onSelect, collapsed, onExpand }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

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
            <span className="pending-badge">{tasks.length}</span>
          </div>
          <div className="kanban-column-body">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onSelect={onSelect} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
