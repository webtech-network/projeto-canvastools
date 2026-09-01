'use client';

import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import EisenhowerQuadrant from './EisenhowerQuadrant';
import { useWorkspace } from './WorkspaceProvider';
import { applyFilters } from '@/lib/workspace/filters';
import { sortTasksByPriority } from '@/lib/workspace/taskSort';
import { QUADRANTS, quadrantOf, priorityForQuadrant } from '@/lib/workspace/quadrant';

const QUADRANT_LABELS = {
  [QUADRANTS.URGENT_IMPORTANT]: 'Urgente e Importante',
  [QUADRANTS.NOT_URGENT_IMPORTANT]: 'Importante, Não urgente',
  [QUADRANTS.URGENT_NOT_IMPORTANT]: 'Urgente, Não importante',
  [QUADRANTS.NOT_URGENT_NOT_IMPORTANT]: 'Não urgente, Não importante',
};

// Rendered in reading order (top-left → bottom-right) matching the spec's
// own 2x2 layout: important/urgent quadrants on top, not-important on
// bottom; urgent on the left, not-urgent on the right.
const QUADRANT_ORDER = [
  QUADRANTS.URGENT_IMPORTANT,
  QUADRANTS.NOT_URGENT_IMPORTANT,
  QUADRANTS.URGENT_NOT_IMPORTANT,
  QUADRANTS.NOT_URGENT_NOT_IMPORTANT,
];

// Done (already finished) never belongs in a priority call — that exclusion
// is unconditional. Backlog/Block are conditional instead, driven by the
// same per-column `collapsedColumns` state that collapses those columns in
// the Kanban board (see KanbanColumn.jsx's own close button and
// WorkspaceView.jsx's Backlog/Block toolbar shortcut): a status collapsed
// there is hidden from the matrix too — closing just Backlog, say, hides
// only Backlog tasks here, not Block's — not yet planned or blocked work
// isn't worth a priority call either, while "expanded" (the default) shows
// every in-flight status.
const MATRIX_ALWAYS_EXCLUDED = new Set(['DONE']);
const MATRIX_HIDDEN_WHEN_COLLAPSED = new Set(['BACKLOG', 'BLOCK']);

export default function EisenhowerMatrix({ onSelect }) {
  const { tasks, projects, filters, moveTaskPriority, collapsedColumns, groupByProject } = useWorkspace();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = applyFilters(tasks, filters, projects).filter((t) => {
    if (MATRIX_ALWAYS_EXCLUDED.has(t.status)) return false;
    if (MATRIX_HIDDEN_WHEN_COLLAPSED.has(t.status) && collapsedColumns.includes(t.status)) return false;
    return true;
  });

  function handleDragEnd({ active, over }) {
    if (!over) return;
    const task = active.data.current?.task;
    if (!task || quadrantOf(task.priority) === over.id) return;
    moveTaskPriority(active.id, priorityForQuadrant(over.id));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="eisenhower-matrix">
        {QUADRANT_ORDER.map((quadrant) => (
          <EisenhowerQuadrant
            key={quadrant}
            quadrant={quadrant}
            label={QUADRANT_LABELS[quadrant]}
            tasks={sortTasksByPriority(filtered.filter((t) => quadrantOf(t.priority) === quadrant))}
            projects={projects}
            groupByProject={groupByProject}
            onSelect={onSelect}
          />
        ))}
      </div>
    </DndContext>
  );
}
