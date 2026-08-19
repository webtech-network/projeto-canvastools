'use client';

import { useState } from 'react';
import { Flag, Zap } from 'lucide-react';
import { useWorkspace } from './WorkspaceProvider';
import WorkspaceFilterBar from './WorkspaceFilterBar';
import QuickAddTask from './QuickAddTask';
import KanbanBoard from './KanbanBoard';
import EisenhowerMatrix from './EisenhowerMatrix';
import TaskDetailModal from './TaskDetailModal';
import ProjectFormModal from './ProjectFormModal';
import { STATUS_META } from '@/lib/workspace/statusMeta';
import { STATUSES } from '@/lib/workspace/tasksRepo';

export default function WorkspaceView() {
  const { view, setView, cardDensity, setCardDensity, loading, tasks } = useWorkspace();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  // Looked up fresh every render (rather than storing the clicked object
  // itself) so the modal always reflects the latest state — e.g. a drag
  // that changes the task moments before the click is still respected.
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) || null : null;

  if (loading) {
    return <p className="lede">Carregando tarefas…</p>;
  }

  return (
    <>
      <div className="browser-controls">
        <div className="segmented" role="group" aria-label="Alternar visão">
          <button
            type="button"
            className={`segmented-btn${view === 'kanban' ? ' active' : ''}`}
            onClick={() => setView('kanban')}
          >
            Kanban
          </button>
          <button
            type="button"
            className={`segmented-btn${view === 'eisenhower' ? ' active' : ''}`}
            onClick={() => setView('eisenhower')}
          >
            Matriz
          </button>
        </div>
        <div className="segmented" role="group" aria-label="Densidade dos cards">
          <button
            type="button"
            className={`segmented-btn${cardDensity === 'expanded' ? ' active' : ''}`}
            onClick={() => setCardDensity('expanded')}
          >
            Aberta
          </button>
          <button
            type="button"
            className={`segmented-btn${cardDensity === 'condensed' ? ' active' : ''}`}
            onClick={() => setCardDensity('condensed')}
          >
            Condensada
          </button>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowProjectForm(true)}>
          + Novo projeto
        </button>
      </div>

      <WorkspaceFilterBar />
      <QuickAddTask />

      {view === 'kanban' ? (
        <KanbanBoard onSelect={(task) => setSelectedTaskId(task.id)} />
      ) : (
        <EisenhowerMatrix onSelect={(task) => setSelectedTaskId(task.id)} />
      )}

      {/* Status is invisible while looking at the Eisenhower matrix, and
          priority is invisible while looking at the Kanban board — this
          legend is what makes the condensed cards' icon-only status/
          priority indicators (see TaskCard.jsx) legible either way. */}
      <ul className="icon-legend">
        {STATUSES.map((status) => {
          const { label, Icon } = STATUS_META[status];
          return (
            <li key={status}>
              <Icon size={14} strokeWidth={1.8} aria-hidden="true" /> {label}
            </li>
          );
        })}
        <li>
          <Flag size={14} strokeWidth={1.8} aria-hidden="true" /> Importante
        </li>
        <li>
          <Zap size={14} strokeWidth={1.8} aria-hidden="true" /> Urgente
        </li>
      </ul>

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTaskId(null)} />}
      {showProjectForm && <ProjectFormModal onClose={() => setShowProjectForm(false)} />}
    </>
  );
}
