'use client';

import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import { useWorkspace } from './WorkspaceProvider';
import { applyFilters } from '@/lib/workspace/filters';
import { STATUSES } from '@/lib/workspace/tasksRepo';
import { STATUS_META } from '@/lib/workspace/statusMeta';

export default function KanbanBoard({ onSelect }) {
  const { tasks, projects, filters, moveTaskStatus } = useWorkspace();
  // A distance activation constraint lets a plain click (no pointer
  // movement) reach TaskCard's onClick normally — without it, dnd-kit's
  // PointerSensor would swallow every click as a zero-distance drag attempt.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = applyFilters(tasks, filters, projects);

  function handleDragEnd({ active, over }) {
    if (!over) return;
    const task = active.data.current?.task;
    if (!task || task.status === over.id) return;
    moveTaskStatus(active.id, over.id);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            label={STATUS_META[status].label}
            tasks={filtered.filter((t) => t.status === status)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </DndContext>
  );
}
