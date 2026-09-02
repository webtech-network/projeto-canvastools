'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import Modal from './Modal';
import ProjectFormModal from './ProjectFormModal';
import { useTasks } from './TasksProvider';
import { useWorkspaceScope } from './WorkspaceScopeProvider';
import { BASE_WORKSPACE_ID } from '@/lib/workspaces/workspacesRepo';
import { STATUSES } from '@/lib/tasks/tasksRepo';
import { STATUS_META } from '@/lib/tasks/statusMeta';
import { listCourseAssignments, listCourseStudentsCached } from '@/lib/tasks/canvasResolution';

// dueDate is stored as a plain 'YYYY-MM-DD' string — same shape a <input
// type="date"> already produces, so no conversion is needed either way (see
// TaskCard.jsx's formatDueDate for why a Date/toISOString round-trip would
// shift the day in timezones behind UTC).
function toDateInputValue(dateStr) {
  return dateStr || '';
}

// Full edit surface (spec section 6) — opened by clicking a TaskCard from
// either view. Also doubles as the "new task" screen: omit `task` and pass
// `initialStatus` instead (KanbanColumn.jsx's double-click-on-empty-space,
// pre-selecting that column's stage) — creation is a two-step
// addTask()-then-editTask() under the hood, since TasksProvider's
// addTask only takes title/projectId, but the modal collects every field in
// one form either way. Wraps the existing Modal.jsx (same component every
// other modal in this app uses); preventBackdropClose guards unsaved edits,
// same rationale as MessageList.jsx's AI reply modal.
export default function TaskDetailModal({ task = null, initialStatus, onClose }) {
  const { projects, addTask, editTask, removeTask } = useTasks();
  const { activeWorkspaceId, activeWorkspace, getVisibleResourceIds } = useWorkspaceScope();
  const isCreating = !task;

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [projectId, setProjectId] = useState(task?.projectId || '');
  const [tags, setTags] = useState(task?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [dueDate, setDueDate] = useState(toDateInputValue(task?.dueDate));
  const [status, setStatus] = useState(task?.status || initialStatus || STATUSES[0]);
  const [urgent, setUrgent] = useState(Boolean(task?.priority?.urgent));
  const [important, setImportant] = useState(Boolean(task?.priority?.important));
  const [priorityRank, setPriorityRank] = useState(Number.isInteger(task?.priorityRank) ? task.priorityRank : 3);
  const [assignmentId, setAssignmentId] = useState(task?.canvasReferences?.assignmentId || '');
  const [studentId, setStudentId] = useState(task?.canvasReferences?.studentId || '');

  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingCanvasRefs, setLoadingCanvasRefs] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const selectedProject = projects.find((p) => p.id === projectId);
  const courseId = selectedProject?.canvasReference?.courseId || null;

  // Scoped to the active workspace (guides creation toward the right
  // context) but never drops the task's own already-selected project, even
  // if it falls outside the current scope — switching workspace mid-edit
  // must not silently blank a field out from under the user.
  const scopedProjects = useMemo(() => {
    if (activeWorkspaceId === BASE_WORKSPACE_ID) return projects;
    const visibleIds = getVisibleResourceIds('project');
    return projects.filter((p) => visibleIds?.has(p.id) || p.id === projectId);
  }, [projects, activeWorkspaceId, getVisibleResourceIds, projectId]);
  const canvasProjects = useMemo(() => scopedProjects.filter((p) => p.type === 'canvas-course'), [scopedProjects]);
  const personalProjects = useMemo(() => scopedProjects.filter((p) => p.type !== 'canvas-course'), [scopedProjects]);

  useEffect(() => {
    if (!courseId) {
      setAssignments([]);
      setStudents([]);
      return;
    }
    let cancelled = false;
    setLoadingCanvasRefs(true);
    Promise.all([listCourseAssignments(courseId), listCourseStudentsCached(courseId)])
      .then(([a, s]) => {
        if (cancelled) return;
        setAssignments(a);
        setStudents(s);
      })
      .finally(() => !cancelled && setLoadingCanvasRefs(false));
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const dirty = isCreating
    ? title.trim().length > 0 || description.trim().length > 0 || tagInput.trim().length > 0
    : title !== task.title ||
      description !== (task.description || '') ||
      projectId !== (task.projectId || '') ||
      tagInput.trim().length > 0;

  function addTag() {
    const value = tagInput.trim();
    if (!value || tags.includes(value)) {
      setTagInput('');
      return;
    }
    setTags([...tags, value]);
    setTagInput('');
  }

  function removeTag(tag) {
    setTags(tags.filter((t) => t !== tag));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const patch = {
        title: title.trim(),
        description,
        projectId: projectId || null,
        tags,
        dueDate: dueDate || null,
        status,
        priority: { urgent, important },
        priorityRank,
        canvasReferences: courseId
          ? { courseId, assignmentId: assignmentId || null, studentId: studentId || null }
          : null,
      };
      if (isCreating) {
        const created = await addTask(title.trim(), projectId || null);
        await editTask(created.id, patch);
      } else {
        await editTask(task.id, patch);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Falha ao salvar a tarefa.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isCreating) return;
    if (!window.confirm('Excluir esta tarefa?')) return;
    setDeleting(true);
    try {
      await removeTask(task.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Modal title={isCreating ? 'Nova tarefa' : 'Detalhes da tarefa'} onClose={onClose} preventBackdropClose={dirty}>
        <form onSubmit={handleSubmit}>
          <label className="compose-message-field">
            <span>Título</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="compose-message-field">
            <span>Descrição</span>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <label className="compose-message-field">
            <span>Projeto</span>
            <div className="task-detail-project-row">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Sem projeto</option>
                {canvasProjects.length > 0 && (
                  <optgroup label="Canvas">
                    {canvasProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {personalProjects.length > 0 && (
                  <optgroup label="Pessoais">
                    {personalProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowProjectForm(true)}>
                + Novo projeto
              </button>
            </div>
            {!projectId && activeWorkspaceId !== BASE_WORKSPACE_ID && (
              <span className="field-note">
                Sem projeto, esta tarefa só aparecerá no workspace Base — não aparecerá no workspace atual (
                {activeWorkspace.name}).
              </span>
            )}
          </label>

          <label className="compose-message-field">
            <span>Tags</span>
            <div className="task-detail-tag-input">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Digite uma tag e pressione Enter"
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={addTag}>
                Adicionar
              </button>
            </div>
            {tags.length > 0 && (
              <div className="kanban-card-tags">
                {tags.map((tag) => (
                  <span key={tag} className="kanban-card-tag task-detail-tag-removable">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} aria-label={`Remover tag ${tag}`}>
                      <X size={11} strokeWidth={2} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </label>

          <div className="task-detail-fields-row">
            <label className="compose-message-field">
              <span>Prazo</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>

            <label className="compose-message-field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="task-detail-fields-row">
            <label className="task-detail-checkbox">
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
              Urgente
            </label>
            <label className="task-detail-checkbox">
              <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
              Importante
            </label>
            <label className="compose-message-field task-detail-priority-field">
              <span>Prioridade (0 = maior, 9 = menor)</span>
              <input
                type="number"
                min={0}
                max={9}
                value={priorityRank}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isNaN(value)) return;
                  setPriorityRank(Math.min(9, Math.max(0, value)));
                }}
              />
            </label>
          </div>

          {courseId && (
            <div className="task-detail-fields-row">
              <label className="compose-message-field">
                <span>Atividade</span>
                <select
                  value={assignmentId}
                  onChange={(e) => setAssignmentId(e.target.value)}
                  disabled={loadingCanvasRefs}
                >
                  <option value="">{loadingCanvasRefs ? 'Carregando…' : 'Nenhuma'}</option>
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="compose-message-field">
                <span>Aluno</span>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={loadingCanvasRefs}
                >
                  <option value="">{loadingCanvasRefs ? 'Carregando…' : 'Nenhum'}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}

          <div className="compose-message-actions task-detail-actions">
            {!isCreating && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Excluindo…' : 'Excluir tarefa'}
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
              {saving ? (isCreating ? 'Criando…' : 'Salvando…') : isCreating ? 'Criar tarefa' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {showProjectForm && (
        <ProjectFormModal
          onClose={() => setShowProjectForm(false)}
        />
      )}
    </>
  );
}
