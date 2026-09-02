'use client';

import { useEffect, useRef, useState } from 'react';
import { Save, Loader2, Pencil, X } from 'lucide-react';
import MarkdownEditor from './MarkdownEditor';
import { markdownToHtml } from '@/lib/markdown';
import { getCourseNote, saveCourseNoteLocal } from '@/lib/courseNotes/courseNotesRepo';
import { mergeSyncCourseNotes } from '@/lib/courseNotes/courseNotesSync';

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Read-only rendering surface for "view" mode: unlike MarkdownEditor's rich
// mode, this div is never contentEditable, so links render as normal
// clickable anchors (a contentEditable anchor swallows a plain click to
// place the caret instead of navigating). Uses the same ref+innerHTML
// pattern as MarkdownEditor.jsx's rich mode rather than
// dangerouslySetInnerHTML, for consistency with that existing surface —
// markdownToHtml escapes source text before building any tag, so this is
// never a raw-HTML pass-through.
function CourseNoteView({ text }) {
  const viewRef = useRef(null);

  useEffect(() => {
    if (viewRef.current) viewRef.current.innerHTML = markdownToHtml(text) || '';
  }, [text]);

  if (!text?.trim()) {
    return <p className="lede">Nenhuma anotação registrada ainda. Clique em "Editar" para começar.</p>;
  }

  return <div ref={viewRef} className="course-note-view" />;
}

// Rendered inline, directly below a course's row in CourseBrowser.jsx's
// table, when that course's name is clicked. Local-first: the textarea
// reflects IndexedDB immediately, edits save to IndexedDB on every
// "Salvar" click regardless of Drive. Drive sync (mergeSyncCourseNotes,
// same bidirectional merge scheme as the Tarefas module, see
// courseNotesSync.js) fires twice, both explicitly, not on a debounce:
// once on mount ("ao abrir estas anotações pela primeira vez, deve
// sincronizar com a base no AppDataFolder") and again every time "Salvar"
// is pressed, after the local write. A professor with Google Drive not
// connected still gets full local editing — mergeSyncCourseNotes's
// rejection (getValidAccessToken throws) is caught and surfaced as a
// quiet status line, never blocking the save itself.
export default function CourseNoteEditor({ courseId, courseCode }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('view'); // view | edit
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncState, setSyncState] = useState('idle'); // idle | syncing | synced | error | not-connected
  const [syncError, setSyncError] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // Last text known to be persisted (loaded, merged from Drive, or just
  // saved) — "Cancelar" reverts to this instead of whatever's mid-edit.
  const savedTextRef = useRef('');
  // Mirrors `mode` for the async Drive-merge callback below, which must not
  // clobber in-progress edits if it resolves while the user is in "edit".
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    let cancelled = false;

    async function loadAndSync() {
      const local = await getCourseNote(courseCode);
      if (!cancelled && local) {
        setText(local.text || '');
        savedTextRef.current = local.text || '';
        setLastSavedAt(local.updatedAt || null);
      }
      if (!cancelled) setLoading(false);

      setSyncState('syncing');
      try {
        const merged = await mergeSyncCourseNotes();
        if (cancelled) return;
        const mine = merged.find((n) => n.courseCode === courseCode);
        if (mine) {
          savedTextRef.current = mine.text || '';
          if (modeRef.current !== 'edit') setText(mine.text || '');
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
      savedTextRef.current = text;
      setLastSavedAt(record.updatedAt);
      setMode('view');
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

  function handleCancel() {
    setText(savedTextRef.current);
    setMode('view');
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

          {mode === 'view' ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode('edit')} disabled={loading}>
              <Pencil size={15} strokeWidth={1.8} />
              Editar
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancel} disabled={saving}>
                <X size={15} strokeWidth={1.8} />
                Cancelar
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={15} strokeWidth={2} className="sync-spin" /> : <Save size={15} strokeWidth={1.8} />}
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <p className="lede">Carregando anotações…</p>
      ) : mode === 'view' ? (
        <CourseNoteView text={text} />
      ) : (
        <MarkdownEditor value={text} onChange={setText} disabled={saving} />
      )}
    </div>
  );
}
