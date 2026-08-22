'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Flag,
  Zap,
  FolderKanban,
  Filter,
  FileJson,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Rows3,
  Rows4,
  Columns3,
  Grid2x2,
} from 'lucide-react';
import { useWorkspace } from './WorkspaceProvider';
import WorkspaceFilterModal from './WorkspaceFilterModal';
import QuickAddTask from './QuickAddTask';
import KanbanBoard from './KanbanBoard';
import EisenhowerMatrix from './EisenhowerMatrix';
import TaskDetailModal from './TaskDetailModal';
import ProjectsManagerModal from './ProjectsManagerModal';
import WorkspaceExportImport from './WorkspaceExportImport';
import { STATUS_META } from '@/lib/workspace/statusMeta';
import { STATUSES } from '@/lib/workspace/tasksRepo';
import { EMPTY_FILTERS } from '@/lib/workspace/filters';

export default function WorkspaceView() {
  const {
    view,
    setView,
    cardDensity,
    setCardDensity,
    stagesCollapsed,
    setStagesCollapsed,
    loading,
    tasks,
    filters,
  } = useWorkspace();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showProjectsManager, setShowProjectsManager] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  // Set by KanbanColumn.jsx's double-click-on-empty-space — opens
  // TaskDetailModal in "create" mode with this status pre-selected.
  const [creatingStatus, setCreatingStatus] = useState(null);
  // Looked up fresh every render (rather than storing the clicked object
  // itself) so the modal always reflects the latest state — e.g. a drag
  // that changes the task moments before the click is still respected.
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) || null : null;

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => value !== EMPTY_FILTERS[key] && value !== null && value !== '',
  );

  if (loading) {
    return <p className="lede">Carregando tarefas…</p>;
  }

  const stagesToggleTitle =
    view === 'kanban'
      ? stagesCollapsed
        ? 'Mostrar colunas Backlog/Block'
        : 'Recolher colunas Backlog/Block'
      : stagesCollapsed
        ? 'Mostrar tarefas de Backlog/Block na matriz'
        : 'Ocultar tarefas de Backlog/Block na matriz';

  return (
    <>
      <div className="workspace-toolbar">
        <div className="workspace-toolbar-primary">
          <QuickAddTask />
        </div>

        <div className="workspace-toolbar-secondary">
        <button
          type="button"
          className={`btn btn-secondary btn-icon${hasActiveFilters ? ' active' : ''}`}
          onClick={() => setShowFilterModal(true)}
          title="Filtrar tarefas"
          aria-label="Filtrar tarefas"
          aria-pressed={hasActiveFilters}
        >
          <Filter size={16} strokeWidth={1.8} />
        </button>

        <button
          type="button"
          className={`btn btn-secondary btn-icon${stagesCollapsed ? ' active' : ''}`}
          onClick={() => setStagesCollapsed(!stagesCollapsed)}
          title={stagesToggleTitle}
          aria-label={stagesToggleTitle}
          aria-pressed={stagesCollapsed}
        >
          {stagesCollapsed ? <PanelLeftOpen size={16} strokeWidth={1.8} /> : <PanelLeftClose size={16} strokeWidth={1.8} />}
        </button>

        <div className="workspace-toolbar-right">
          <div className="segmented" role="group" aria-label="Densidade dos cards">
            <button
              type="button"
              className={`segmented-btn icon-only${cardDensity === 'expanded' ? ' active' : ''}`}
              onClick={() => setCardDensity('expanded')}
              title="Densidade aberta"
              aria-label="Densidade aberta"
              aria-pressed={cardDensity === 'expanded'}
            >
              <Rows3 size={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className={`segmented-btn icon-only${cardDensity === 'condensed' ? ' active' : ''}`}
              onClick={() => setCardDensity('condensed')}
              title="Densidade condensada"
              aria-label="Densidade condensada"
              aria-pressed={cardDensity === 'condensed'}
            >
              <Rows4 size={16} strokeWidth={1.8} />
            </button>
          </div>

          <div className="segmented" role="group" aria-label="Alternar visão">
            <button
              type="button"
              className={`segmented-btn icon-only${view === 'kanban' ? ' active' : ''}`}
              onClick={() => setView('kanban')}
              title="Kanban"
              aria-label="Kanban"
              aria-pressed={view === 'kanban'}
            >
              <Columns3 size={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className={`segmented-btn icon-only${view === 'eisenhower' ? ' active' : ''}`}
              onClick={() => setView('eisenhower')}
              title="Matriz de Eisenhower"
              aria-label="Matriz de Eisenhower"
              aria-pressed={view === 'eisenhower'}
            >
              <Grid2x2 size={16} strokeWidth={1.8} />
            </button>
          </div>

          <button type="button" className="btn btn-secondary btn-icon" onClick={() => setShowProjectsManager(true)} title="Projetos" aria-label="Projetos">
            <FolderKanban size={16} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => setShowExportImport(true)}
            title="Exportar/Importar tarefas (JSON)"
            aria-label="Exportar/Importar tarefas (JSON)"
          >
            <FileJson size={16} strokeWidth={1.8} />
          </button>

          <Link
            href="/perfil?tab=preferencias"
            className="btn btn-secondary btn-icon"
            title="Preferências de Tarefas"
            aria-label="Preferências de Tarefas"
          >
            <Settings size={16} strokeWidth={1.8} />
          </Link>
        </div>
        </div>
      </div>

      {view === 'kanban' ? (
        <KanbanBoard onSelect={(task) => setSelectedTaskId(task.id)} onCreate={(status) => setCreatingStatus(status)} />
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
        <li className="icon-legend-separator" aria-hidden="true" />
        <li>
          <Flag size={14} strokeWidth={1.8} aria-hidden="true" /> Importante
        </li>
        <li>
          <Zap size={14} strokeWidth={1.8} aria-hidden="true" /> Urgente
        </li>
      </ul>

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTaskId(null)} />}
      {creatingStatus && <TaskDetailModal initialStatus={creatingStatus} onClose={() => setCreatingStatus(null)} />}
      {showProjectsManager && <ProjectsManagerModal onClose={() => setShowProjectsManager(false)} />}
      {showFilterModal && <WorkspaceFilterModal onClose={() => setShowFilterModal(false)} />}
      {showExportImport && <WorkspaceExportImport onClose={() => setShowExportImport(false)} />}
    </>
  );
}
