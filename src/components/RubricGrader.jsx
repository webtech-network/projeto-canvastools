'use client';

import { useMemo, useState } from 'react';
import {
  extractExistingSelections,
  computeTotalPoints,
  buildGradePayload,
  summarizeSubmissionStatus,
} from '@/lib/rubricGrading';
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChangesGuard';

function buildInitialRows(submissions) {
  return submissions
    .filter((s) => s.user_id)
    .map((s) => ({
      userId: s.user_id,
      name: s.user?.name || `Aluno ${s.user_id}`,
      status: summarizeSubmissionStatus(s),
      hasSubmission: s.workflow_state !== 'unsubmitted',
      selections: extractExistingSelections(s),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function bestRating(criterion) {
  return (criterion.ratings || []).reduce(
    (best, rating) => (rating.points > (best?.points ?? -Infinity) ? rating : best),
    null,
  );
}

// The single-table "go through every student in one sitting" dynamic ported
// from RubricTool — one row per student, one <select> per rubric criterion
// — but grades are now submitted to Canvas as a real, structured
// rubric_assessment (see src/lib/rubricGrading.js) instead of the ported
// tool's text-comment-only workaround.
export default function RubricGrader({ courseId, assignmentId, rubric, submissions }) {
  const [rows, setRows] = useState(() => buildInitialRows(submissions));
  const [comments, setComments] = useState({});
  const [rowState, setRowState] = useState({}); // { [userId]: { saving, error, saved } }
  const [hideMissing, setHideMissing] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  // Rows touched since load/last successful send — drives the leave-page
  // warning below. Selections pre-filled from Canvas on load don't count as
  // dirty; only user-triggered edits do.
  const [dirtyRows, setDirtyRows] = useState(() => new Set());

  useUnsavedChangesGuard(dirtyRows.size > 0);

  const visibleRows = useMemo(() => (hideMissing ? rows.filter((r) => r.hasSubmission) : rows), [rows, hideMissing]);

  function markDirty(userId) {
    setDirtyRows((prev) => new Set(prev).add(userId));
  }

  function markClean(userId) {
    setDirtyRows((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }

  function updateSelection(userId, criterionId, rating) {
    markDirty(userId);
    setRows((prev) =>
      prev.map((r) => {
        if (r.userId !== userId) return r;
        const nextSelections = { ...r.selections };
        if (rating) {
          nextSelections[criterionId] = { ratingId: rating.id, points: rating.points, comments: '' };
        } else {
          delete nextSelections[criterionId];
        }
        return { ...r, selections: nextSelections };
      }),
    );
  }

  function setMaxGrade(userId) {
    markDirty(userId);
    setRows((prev) =>
      prev.map((r) => {
        if (r.userId !== userId) return r;
        const selections = {};
        for (const criterion of rubric) {
          const rating = bestRating(criterion);
          if (rating) selections[criterion.id] = { ratingId: rating.id, points: rating.points, comments: '' };
        }
        return { ...r, selections };
      }),
    );
  }

  // Clearing discards the local draft entirely — since nothing was ever
  // sent to Canvas, there's nothing pending to lose, so this marks the row
  // clean (no yellow highlight) rather than dirty.
  function clearGrade(userId) {
    markClean(userId);
    setRows((prev) => prev.map((r) => (r.userId === userId ? { ...r, selections: {} } : r)));
  }

  function updateComment(userId, value) {
    markDirty(userId);
    setComments((prev) => ({ ...prev, [userId]: value }));
  }

  async function sendGrade(userId) {
    const row = rows.find((r) => r.userId === userId);
    if (!row) return;
    setRowState((prev) => ({ ...prev, [userId]: { saving: true, error: null, saved: false } }));
    try {
      const total = computeTotalPoints(row.selections);
      const payload = buildGradePayload(rubric, row.selections, total, comments[userId] || '');
      const response = await fetch(
        `/api/canvas/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao enviar a nota.');
      setRowState((prev) => ({ ...prev, [userId]: { saving: false, error: null, saved: true } }));
      setRows((prev) => prev.map((r) => (r.userId === userId ? { ...r, status: 'Avaliada' } : r)));
      markClean(userId);
    } catch (err) {
      setRowState((prev) => ({ ...prev, [userId]: { saving: false, error: err.message, saved: false } }));
    }
  }

  async function sendAll() {
    const rowsToSend = visibleRows.filter((r) => Object.keys(r.selections).length > 0);
    if (rowsToSend.length === 0) return;
    if (
      !window.confirm(`Enviar as notas de ${rowsToSend.length} aluno(s) para o Canvas? Isso substitui a nota atual de cada um.`)
    ) {
      return;
    }
    setBulkSending(true);
    setBulkError(null);
    // Sequential, not Promise.all — same concurrent-Canvas-call race this
    // app avoids on every other multi-request flow.
    for (const row of rowsToSend) {
      await sendGrade(row.userId);
    }
    setBulkSending(false);
  }

  if (rows.length === 0) {
    return <p className="lede">Nenhum aluno matriculado nesta atividade.</p>;
  }

  return (
    <div className="rubric-grader">
      <div className="browser-controls">
        <label className="rubric-grader-filter">
          <input type="checkbox" checked={hideMissing} onChange={(e) => setHideMissing(e.target.checked)} />
          Ocultar sem entrega
        </label>
        <button type="button" className="btn btn-primary" disabled={bulkSending} onClick={sendAll}>
          {bulkSending ? 'Enviando…' : 'Enviar todas as notas'}
        </button>
      </div>

      {bulkError && (
        <p className="alert alert-error" role="alert">
          {bulkError}
        </p>
      )}

      {visibleRows.length === 0 ? (
        <p className="lede">Nenhum aluno para exibir com esse filtro.</p>
      ) : (
        <div className="rubric-grader-table-wrap">
          <table className="data-table rubric-grader-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Status</th>
                {rubric.map((criterion) => (
                  <th key={criterion.id}>
                    {criterion.description} ({criterion.points} pts)
                  </th>
                ))}
                <th>Nota</th>
                <th>Comentário</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const state = rowState[row.userId] || {};
                const total = computeTotalPoints(row.selections);
                const hasAnySelection = Object.keys(row.selections).length > 0;
                const isDirty = dirtyRows.has(row.userId);
                return (
                  <tr key={row.userId} className={isDirty ? 'is-dirty' : undefined}>
                    <td className="course-name-cell">{row.name}</td>
                    <td>{row.status}</td>
                    {rubric.map((criterion) => {
                      const sel = row.selections[criterion.id];
                      return (
                        <td key={criterion.id}>
                          <select
                            aria-label={`${criterion.description} — ${row.name}`}
                            value={sel?.ratingId || ''}
                            onChange={(e) => {
                              const rating = criterion.ratings?.find((r) => r.id === e.target.value);
                              updateSelection(row.userId, criterion.id, rating || null);
                            }}
                          >
                            <option value="">—</option>
                            {criterion.ratings?.map((rating) => (
                              <option key={rating.id} value={rating.id}>
                                {rating.description} ({rating.points})
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                    <td className="rubric-grader-total">{total}</td>
                    <td>
                      <textarea
                        rows={2}
                        value={comments[row.userId] || ''}
                        onChange={(e) => updateComment(row.userId, e.target.value)}
                        placeholder="Comentário para o aluno…"
                      />
                    </td>
                    <td className="actions-cell rubric-grader-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMaxGrade(row.userId)}>
                        Nota máxima
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => clearGrade(row.userId)}>
                        Limpar
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={state.saving || !hasAnySelection}
                        onClick={() => sendGrade(row.userId)}
                      >
                        {state.saving ? 'Enviando…' : state.saved ? 'Enviado ✓' : 'Enviar'}
                      </button>
                      {state.error && (
                        <p className="alert alert-error" role="alert">
                          {state.error}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
