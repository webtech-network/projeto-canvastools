'use client';

import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';

// `collapsed` (Backlog/Block, toggled from WorkspaceView.jsx) shrinks the
// column to a narrow strip showing only its label + count — the droppable
// stays active even collapsed, so a card can still be dragged straight into
// Backlog/Block without expanding it first.
export default function KanbanColumn({ status, label, tasks, onSelect, collapsed }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column${isOver ? ' kanban-column--over' : ''}${collapsed ? ' kanban-column--collapsed' : ''}`}
    >
      {collapsed ? (
        <div className="kanban-column-collapsed-label">
          <span>{label}</span>
          <span className="pending-badge">{tasks.length}</span>
        </div>
      ) : (
        <>
          <div className="kanban-column-header">
            <span>{label}</span>
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
