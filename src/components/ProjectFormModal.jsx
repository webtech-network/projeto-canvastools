'use client';

import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useWorkspace } from './WorkspaceProvider';
import { listCoursesCached } from '@/lib/workspace/canvasResolution';

export default function ProjectFormModal({ onClose }) {
  const { addProject } = useWorkspace();
  const [name, setName] = useState('');
  const [type, setType] = useState('personal');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

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
      await addProject({
        name: name.trim(),
        type,
        canvasReference: type === 'canvas-course' ? { courseId } : null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Falha ao criar o projeto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Novo projeto" onClose={onClose} preventBackdropClose={Boolean(name.trim())}>
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
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <div className="compose-message-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
            {saving ? 'Criando…' : 'Criar projeto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
