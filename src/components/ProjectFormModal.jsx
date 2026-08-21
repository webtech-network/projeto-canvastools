'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import Modal from './Modal';
import { useWorkspace } from './WorkspaceProvider';
import { listCoursesCached } from '@/lib/workspace/canvasResolution';
import { PROJECT_COLORS } from '@/lib/workspace/projectColors';

// Doubles as create and edit — `project` (optional) pre-fills the form and
// switches the submit action to editProject instead of addProject; used
// both by WorkspaceView.jsx's top-level "+ Novo projeto" and by
// ProjectsManagerModal.jsx's per-row "Editar".
export default function ProjectFormModal({ project = null, onClose }) {
  const { addProject, editProject } = useWorkspace();
  const isEditing = Boolean(project);

  const [name, setName] = useState(project?.name || '');
  const [type, setType] = useState(project?.type || 'personal');
  const [courseId, setCourseId] = useState(project?.canvasReference?.courseId || '');
  const [color, setColor] = useState(project?.color || null);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Only Canvas-favorited courses are offered — same "favorites only, for
  // cost/relevance reasons" convention CourseBrowser.jsx and the messages
  // screens already use elsewhere in this app.
  const favoriteCourses = courses.filter((c) => c.is_favorite);

  useEffect(() => {
    if (type !== 'canvas-course' || courses.length > 0) return;
    setLoadingCourses(true);
    listCoursesCached()
      .then(setCourses)
      .finally(() => setLoadingCourses(false));
  }, [type, courses.length]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (type === 'canvas-course' && !courseId) {
      setError('Selecione um curso.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        type,
        canvasReference: type === 'canvas-course' ? { courseId } : null,
        color,
      };
      if (isEditing) {
        await editProject(project.id, payload);
      } else {
        await addProject(payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Falha ao salvar o projeto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEditing ? 'Editar projeto' : 'Novo projeto'}
      onClose={onClose}
      preventBackdropClose={Boolean(name.trim())}
    >
      <form onSubmit={handleSubmit}>
        <label className="compose-message-field">
          <span>Nome</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do projeto" />
        </label>

        <label className="compose-message-field">
          <span>Tipo</span>
          <div className="segmented" role="group" aria-label="Tipo de projeto">
            <button
              type="button"
              className={`segmented-btn${type === 'personal' ? ' active' : ''}`}
              onClick={() => setType('personal')}
            >
              Pessoal
            </button>
            <button
              type="button"
              className={`segmented-btn${type === 'canvas-course' ? ' active' : ''}`}
              onClick={() => setType('canvas-course')}
            >
              Curso do Canvas
            </button>
          </div>
        </label>

        {type === 'canvas-course' && (
          <label className="compose-message-field">
            <span>Curso</span>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} disabled={loadingCourses}>
              <option value="">{loadingCourses ? 'Carregando…' : 'Selecione um curso'}</option>
              {favoriteCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="field-note">
              Somente cursos marcados como favoritos no Canvas aparecem aqui — marque um curso como favorito no
              Painel de Cursos para vinculá-lo a um projeto.
            </span>
          </label>
        )}

        <label className="compose-message-field">
          <span>Cor</span>
          <div className="project-color-picker" role="radiogroup" aria-label="Cor do projeto">
            <button
              type="button"
              className={`project-color-swatch project-color-swatch--none${color === null ? ' active' : ''}`}
              onClick={() => setColor(null)}
              title="Sem cor"
              aria-label="Sem cor"
              role="radio"
              aria-checked={color === null}
            >
              {color === null && <Check size={14} strokeWidth={2.4} />}
            </button>
            {PROJECT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`project-color-swatch${color === c.hex ? ' active' : ''}`}
                style={{ backgroundColor: c.hex }}
                onClick={() => setColor(c.hex)}
                title={c.label}
                aria-label={c.label}
                role="radio"
                aria-checked={color === c.hex}
              >
                {color === c.hex && <Check size={14} strokeWidth={2.4} color="#fff" />}
              </button>
            ))}
          </div>
          <span className="field-note">A cor escolhida é usada como fundo suave nas tarefas deste projeto.</span>
        </label>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <div className="compose-message-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
            {saving ? 'Salvando…' : isEditing ? 'Salvar projeto' : 'Criar projeto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
