'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Flag, Zap, CalendarDays } from 'lucide-react';
import { useWorkspace } from './WorkspaceProvider';
import { STATUS_META } from '@/lib/workspace/statusMeta';

// `dueDate` is stored as a plain 'YYYY-MM-DD' string (no time/timezone) —
// parsing it via `new Date('YYYY-MM-DD')` treats it as UTC midnight per the
// ISO 8601 spec, which then displays as the *previous* day in any timezone
// behind UTC (e.g. Brazil) once formatted in local time. Building the Date
// from its numeric parts instead uses the local-time constructor, so the
// displayed day always matches what was picked in the date input.
function formatDueDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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
// what each icon means.
export default function TaskCard({ task, onSelect }) {
  const { projects, cardDensity } = useWorkspace();
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
  const dueDate = formatDueDate(task.dueDate);
  const StatusIcon = STATUS_META[task.status]?.Icon;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 10 }
    : undefined;

  const condensed = cardDensity === 'condensed';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card${isDragging ? ' is-dragging' : ''}${condensed ? ' kanban-card--condensed' : ''}`}
      onClick={() => onSelect(task)}
      {...listeners}
      {...attributes}
    >
      {condensed ? (
        <>
          <div className="kanban-card-condensed-text">
            <div className="kanban-card-title">{task.title}</div>
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
            <div className="kanban-card-condensed-icons">
              {StatusIcon && (
                <span className="kanban-card-status-icon" title={STATUS_META[task.status].label}>
                  <StatusIcon size={14} strokeWidth={1.8} />
                </span>
              )}
              {task.priority?.important && (
                <span className="kanban-card-flag" title="Importante">
                  <Flag size={14} strokeWidth={1.8} />
                </span>
              )}
              {task.priority?.urgent && (
                <span className="kanban-card-urgent" title="Urgente">
                  <Zap size={14} strokeWidth={1.8} />
                </span>
              )}
              {dueDate && (
                <span className="kanban-card-due" title="Prazo">
                  <CalendarDays size={14} strokeWidth={1.8} /> {dueDate}
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="kanban-card-title">{task.title}</div>
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
          {(task.priority?.important || task.priority?.urgent || dueDate) && (
            <div className="kanban-card-footer">
              {task.priority?.important && (
                <span className="kanban-card-flag" title="Importante">
                  <Flag size={13} strokeWidth={1.8} /> Importante
                </span>
              )}
              {task.priority?.urgent && (
                <span className="kanban-card-urgent" title="Urgente">
                  <Zap size={13} strokeWidth={1.8} /> Urgente
                </span>
              )}
              {dueDate && (
                <span className="kanban-card-due">
                  <CalendarDays size={13} strokeWidth={1.8} /> {dueDate}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
