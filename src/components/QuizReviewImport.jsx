'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, CircleCheck, CircleX } from 'lucide-react';

// Shared review/select/import table — fed either by ImportQuestions.jsx
// (file upload) or by QuestionGenerator.jsx (AI generation, already
// structurally validated server-side, no re-validation needed here).
// Callers must remount this component (via a changing `key`) whenever
// `quiz` is swapped for a genuinely different batch — this component does
// not reset its own selection/results state on prop changes.
export default function QuizReviewImport({ courseId, quizId, quiz, warnings }) {
  const [selected, setSelected] = useState(() => quiz.questions.map(() => true));
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const allSelected = selected.length > 0 && selected.every(Boolean);
  const selectedCount = selected.filter(Boolean).length;

  function toggleAll() {
    setSelected((prev) => prev.map(() => !allSelected));
  }

  function toggleOne(index) {
    setSelected((prev) => prev.map((value, i) => (i === index ? !value : value)));
  }

  async function handleImport() {
    const selectedQuestions = quiz.questions.filter((_, i) => selected[i]);
    if (selectedQuestions.length === 0) return;

    setImporting(true);
    setSubmitError(null);
    setResults(null);

    try {
      const response = await fetch('/api/canvas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, quizId, questions: selectedQuestions }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(data.error || 'Falha ao importar as questões.');
      } else {
        setResults(data.results);
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="quiz-review-import">
      {warnings.length > 0 && (
        <div className="alert alert-warning">
          <button type="button" className="alert-toggle" onClick={() => setWarningsOpen((v) => !v)}>
            {warningsOpen ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
            {warnings.length} aviso(s) de formatação (não impedem a importação)
          </button>
          {warningsOpen && (
            <ul>
              {warnings.map((message, i) => (
                <li key={i}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Selecionar todas" />
            </th>
            <th>Questão</th>
            <th>Modelo</th>
            <th>Pontos</th>
            <th>Alternativas</th>
          </tr>
        </thead>
        <tbody>
          {quiz.questions.map((q, i) => (
            <tr key={i}>
              <td>
                <input type="checkbox" checked={Boolean(selected[i])} onChange={() => toggleOne(i)} />
              </td>
              <td>{q.question_name}</td>
              <td>{q.question_model || '—'}</td>
              <td>{q.points_possible ?? 1}</td>
              <td>{(q.answers || []).length}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        className="btn btn-primary"
        disabled={selectedCount === 0 || importing}
        onClick={handleImport}
      >
        {importing ? 'Importando…' : `Importar selecionadas (${selectedCount})`}
      </button>

      {submitError && <div className="alert alert-error">{submitError}</div>}

      {results && (
        <div className="import-results">
          <h2>Resultado da importação</h2>
          <ul>
            {results.map((r) => (
              <li key={r.index} className={r.success ? 'result-ok' : 'result-fail'}>
                {r.success ? (
                  <>
                    <CircleCheck size={14} strokeWidth={2} />
                    {r.name} — ID no Canvas: {r.canvasId}
                  </>
                ) : (
                  <>
                    <CircleX size={14} strokeWidth={2} />
                    {r.name} — {r.error}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
