'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import MarkdownEditor from './MarkdownEditor';
import { getCourseNote, saveCourseNoteLocal } from '@/lib/courseNotes/courseNotesRepo';
import { mergeSyncCourseNotes } from '@/lib/courseNotes/courseNotesSync';

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Rendered inline, directly below a course's row in CourseBrowser.jsx's
// table, when that course's name is clicked. Local-first: the textarea
// reflects IndexedDB immediately, edits save to IndexedDB on every
// "Salvar" click regardless of Drive. Drive sync (mergeSyncCourseNotes,
// same bidirectional merge scheme as the Tarefas workspace, see
// courseNotesSync.js) fires twice, both explicitly, not on a debounce:
// once on mount ("ao abrir estas anotações pela primeira vez, deve
// sincronizar com a base no AppDataFolder") and again every time "Salvar"
// is pressed, after the local write. A professor with Google Drive not
// connected still gets full local editing — mergeSyncCourseNotes's
// rejection (getValidAccessToken throws) is caught and surfaced as a
// quiet status line, never blocking the save itself.
export default function CourseNoteEditor({ courseId, courseCode }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncState, setSyncState] = useState('idle'); // idle | syncing | synced | error | not-connected
  const [syncError, setSyncError] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAndSync() {
      const local = await getCourseNote(courseCode);
      if (!cancelled && local) {
        setText(local.text || '');
        setLastSavedAt(local.updatedAt || null);
      }
      if (!cancelled) setLoading(false);

      setSyncState('syncing');
      try {
        const merged = await mergeSyncCourseNotes();
        if (cancelled) return;
        const mine = merged.find((n) => n.courseCode === courseCode);
        if (mine) {
          setText(mine.text || '');
          setLastSavedAt(mine.updatedAt || null);
        }
        setSyncState('synced');
      } catch (err) {
        if (cancelled) return;
        const notConnected = /não está conectado/.test(err.message || '');
        setSyncState(notConnected ? 'not-connected' : 'error');
        setSyncError(notConnected ? null : err.message);
      }
    }

    loadAndSync();
    return () => {
      cancelled = true;
    };
  }, [courseCode]);

  async function handleSave() {
    setSaving(true);
    setSyncError(null);
    try {
      const record = await saveCourseNoteLocal(courseCode, { courseId, text });
      setLastSavedAt(record.updatedAt);
      setSyncState('syncing');
      try {
        await mergeSyncCourseNotes();
        setSyncState('synced');
      } catch (err) {
        const notConnected = /não está conectado/.test(err.message || '');
        setSyncState(notConnected ? 'not-connected' : 'error');
        setSyncError(notConnected ? null : err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="course-note-editor">
      <div className="course-note-editor-topbar">
        <h3 className="course-note-editor-title">Notas do curso</h3>

        <div className="course-note-editor-topbar-right">
          <span className="course-note-editor-status">
            {syncState === 'syncing' && 'Sincronizando com o Google Drive…'}
            {syncState === 'synced' &&
              (lastSavedAt
                ? `Sincronizado — ${formatDateTime(new Date(lastSavedAt).toISOString())}`
                : 'Sincronizado — nada salvo ainda para este curso.')}
            {syncState === 'not-connected' && 'Google Drive não conectado — salvando só neste navegador.'}
            {syncState === 'error' && (syncError || 'Falha ao sincronizar com o Google Drive.')}
          </span>

          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 size={15} strokeWidth={2} className="sync-spin" /> : <Save size={15} strokeWidth={1.8} />}
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="lede">Carregando anotações…</p>
      ) : (
        <MarkdownEditor value={text} onChange={setText} disabled={saving} />
      )}
    </div>
  );
}
