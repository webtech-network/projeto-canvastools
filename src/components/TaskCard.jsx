'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Flag, Zap, CalendarDays } from 'lucide-react';
import { useWorkspace } from './WorkspaceProvider';
import { STATUS_META } from '@/lib/workspace/statusMeta';
import { projectCardStyle } from '@/lib/workspace/projectColors';
import { formatDueDate, isPastDue } from '@/lib/workspace/dueDate';

// Interleaves a thin visual separator between whichever of the meta groups
// (priority rank / status / classification / due date) actually have
// content — never a dangling separator next to nothing.
function withSeparators(nodes) {
  const visible = nodes.filter(Boolean);
  return visible.flatMap((node, i) =>
    i === 0 ? [node] : [<span key={`sep-${node.key}`} className="kanban-card-meta-separator" aria-hidden="true" />, node],
  );
}

// Shared by KanbanBoard.jsx and EisenhowerMatrix.jsx — same card, same
// click-to-open behavior; only the droppable container it sits in differs
// between the two views (KanbanColumn vs EisenhowerQuadrant). Renders in one
// of two densities (WorkspaceProvider's cardDensity, toggled in
// WorkspaceView.jsx) — 'expanded' is the original full layout, 'condensed'
// packs the same information into two lines of text plus a column of icons,
// so status (otherwise invisible in the Eisenhower view) and priority
// (otherwise invisible in the Kanban view) stay visible regardless of which
// board is showing. See the icon legend in WorkspaceView.jsx's footer for
// what each icon means. Status/classification/due date share one
// `metaSegments` builder below (separators, per-density icon size and
// label visibility) so both densities stay in sync automatically.
export default function TaskCard({ task, onSelect }) {
  const { projects, cardDensity } = useWorkspace();
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
  const dueDate = formatDueDate(task.dueDate);
  const StatusIcon = STATUS_META[task.status]?.Icon;
  const overdue = isPastDue(task.dueDate, task.status);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = {
    ...projectCardStyle(project),
    ...(transform ? { transform: CSS.Translate.toString(transform), zIndex: 10 } : undefined),
  };

  const condensed = cardDensity === 'condensed';
  const iconSize = condensed ? 14 : 13;

  // 0 (maior) a 9 (menor) — see taskSort.js's comparePriority, which orders
  // this task within its Kanban column / Eisenhower quadrant / TaskTable row
  // by this same value. Shown here so that ordering is legible on the card
  // itself, not just as an invisible sort key.
  const priorityRankSeg = (
    <span key="priority" className="priority-rank-badge" title="Prioridade (0 = maior, 9 = menor)">
      P{task.priorityRank ?? 3}
    </span>
  );

  const statusSeg = StatusIcon ? (
    <span key="status" className="kanban-card-status-icon" title={STATUS_META[task.status].label}>
      <StatusIcon size={iconSize} strokeWidth={1.8} />
      {!condensed && ` ${STATUS_META[task.status].label}`}
    </span>
  ) : null;

  const classificationSeg =
    task.priority?.important || task.priority?.urgent ? (
      <span key="classification" className="kanban-card-classification">
        {task.priority?.important && (
          <span className="kanban-card-flag" title="Importante">
            <Flag size={iconSize} strokeWidth={1.8} />
            {!condensed && ' Importante'}
          </span>
        )}
        {task.priority?.urgent && (
          <span className="kanban-card-urgent" title="Urgente">
            <Zap size={iconSize} strokeWidth={1.8} />
            {!condensed && ' Urgente'}
          </span>
        )}
      </span>
    ) : null;

  const dueSeg = dueDate ? (
    <span key="due" className={`kanban-card-due${overdue ? ' is-past-due' : ''}`} title={overdue ? 'Prazo vencido' : 'Prazo'}>
      <CalendarDays size={iconSize} strokeWidth={1.8} /> {dueDate}
    </span>
  ) : null;

  const metaSegments = withSeparators([priorityRankSeg, statusSeg, classificationSeg, dueSeg]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card${isDragging ? ' is-dragging' : ''}${condensed ? ' kanban-card--condensed' : ''}`}
      onClick={() => onSelect(task)}
    >
      {condensed ? (
        <>
          <div className="kanban-card-condensed-text">
            {/* Drag activation is scoped to the title text (not the whole
                card) — on touch, dragging from anywhere else on the card
                fought with tapping to open it or scrolling the column. */}
            <div className="kanban-card-title" {...listeners} {...attributes}>
              {task.title}
            </div>
            <div className="kanban-card-project">{project ? project.name : 'Sem projeto'}</div>
          </div>
          <div className="kanban-card-condensed-side">
            {task.tags?.length > 0 && (
              <div className="kanban-card-tags">
                {task.tags.map((tag) => (
                  <span key={tag} className="kanban-card-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="kanban-card-condensed-icons">{metaSegments}</div>
          </div>
        </>
      ) : (
        <>
          <div className="kanban-card-title" {...listeners} {...attributes}>
            {task.title}
          </div>
          {project && <div className="kanban-card-project">{project.name}</div>}
          {task.tags?.length > 0 && (
            <div className="kanban-card-tags">
              {task.tags.map((tag) => (
                <span key={tag} className="kanban-card-tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          <div className="kanban-card-footer">{metaSegments}</div>
        </>
      )}
    </div>
  );
}
