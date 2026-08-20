'use client';

import { Info } from 'lucide-react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import EisenhowerQuadrant from './EisenhowerQuadrant';
import { useWorkspace } from './WorkspaceProvider';
import { applyFilters } from '@/lib/workspace/filters';
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

// The matrix is for deciding what to prioritize among work that's actually
// in flight — Backlog (not yet planned) and Done (already finished) don't
// belong in a priority call, and Block sits out too since it's waiting on
// something else, not something to rank by urgency/importance right now.
const MATRIX_STATUSES = new Set(['TODO', 'DOING']);

export default function EisenhowerMatrix({ onSelect }) {
  const { tasks, projects, filters, moveTaskPriority } = useWorkspace();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = applyFilters(tasks, filters, projects).filter((t) => MATRIX_STATUSES.has(t.status));

  function handleDragEnd({ active, over }) {
    if (!over) return;
    const task = active.data.current?.task;
    if (!task || quadrantOf(task.priority) === over.id) return;
    moveTaskPriority(active.id, priorityForQuadrant(over.id));
  }

  return (
    <>
      <p className="alert alert-info">
        <Info size={16} strokeWidth={1.8} aria-hidden="true" />
        A matriz mostra apenas tarefas em Todo e Doing — Backlog, Block e Done ficam fora, já que priorizar não se
        aplica a tarefas ainda não planejadas, impedidas ou já concluídas.
      </p>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="eisenhower-matrix">
          {QUADRANT_ORDER.map((quadrant) => (
            <EisenhowerQuadrant
              key={quadrant}
              quadrant={quadrant}
              label={QUADRANT_LABELS[quadrant]}
              tasks={filtered.filter((t) => quadrantOf(t.priority) === quadrant)}
              onSelect={onSelect}
            />
          ))}
        </div>
      </DndContext>
    </>
  );
}
