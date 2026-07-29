'use client';

import { useState } from 'react';
import { validateStructural, createSchemaValidator } from '@/lib/quizValidation';
import quizSchema from '@/lib/quiz.schema.json';

const checkSchema = createSchemaValidator(quizSchema);

export default function ImportQuestions({ courseId, quizId }) {
  const [fileName, setFileName] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [structuralErrors, setStructuralErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const allSelected = selected.length > 0 && selected.every(Boolean);
  const selectedCount = selected.filter(Boolean).length;

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setResults(null);
    setSubmitError(null);
    setFileName(file.name);

    let parsed;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch (err) {
      setQuizData(null);
      setWarnings([]);
      setSelected([]);
      setStructuralErrors([`Não foi possível interpretar o arquivo como JSON: ${err.message}`]);
      return;
    }

    const structural = validateStructural(parsed);
    setStructuralErrors(structural.errors);

    if (structural.valid) {
      setQuizData(parsed);
      setWarnings(checkSchema(parsed));
      setSelected(parsed.questions.map(() => true));
    } else {
      setQuizData(null);
      setWarnings([]);
      setSelected([]);
    }
  }

  function toggleAll() {
    setSelected((prev) => prev.map(() => !allSelected));
  }

  function toggleOne(index) {
    setSelected((prev) => prev.map((value, i) => (i === index ? !value : value)));
  }

  async function handleImport() {
    if (!quizData) return;
    const selectedQuestions = quizData.questions.filter((_, i) => selected[i]);
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
    <div className="import-panel">
      <div className="file-drop">
        <label className="btn btn-secondary" htmlFor="quiz-file">
          {fileName ? `Arquivo: ${fileName}` : 'Selecionar arquivo .json'}
        </label>
        <input id="quiz-file" type="file" accept=".json,application/json" onChange={handleFile} hidden />
      </div>

      {structuralErrors.length > 0 && (
        <div className="alert alert-error">
          <strong>Não é possível importar este arquivo:</strong>
          <ul>
            {structuralErrors.map((message, i) => (
              <li key={i}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {quizData && (
        <>
          {warnings.length > 0 && (
            <div className="alert alert-warning">
              <button type="button" className="alert-toggle" onClick={() => setWarningsOpen((v) => !v)}>
                {warningsOpen ? '▾' : '▸'} {warnings.length} aviso(s) de formatação (não impedem a importação)
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
              {quizData.questions.map((q, i) => (
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
        </>
      )}

      {submitError && <div className="alert alert-error">{submitError}</div>}

      {results && (
        <div className="import-results">
          <h2>Resultado da importação</h2>
          <ul>
            {results.map((r) => (
              <li key={r.index} className={r.success ? 'result-ok' : 'result-fail'}>
                {r.success ? `✓ ${r.name} — ID no Canvas: ${r.canvasId}` : `✗ ${r.name} — ${r.error}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
