'use client';

import { useState } from 'react';
import { validateStructural, createSchemaValidator } from '@/lib/quizValidation';
import quizSchema from '@/lib/quiz.schema.json';
import QuizReviewImport from './QuizReviewImport';

const checkSchema = createSchemaValidator(quizSchema);

export default function ImportQuestions({ courseId, quizId }) {
  const [fileName, setFileName] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [structuralErrors, setStructuralErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  // Bumped on every successful parse so <QuizReviewImport> remounts (via its
  // key) instead of keeping stale selection/results from a previous file.
  const [loadId, setLoadId] = useState(0);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    let parsed;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch (err) {
      setQuizData(null);
      setWarnings([]);
      setStructuralErrors([`Não foi possível interpretar o arquivo como JSON: ${err.message}`]);
      return;
    }

    const structural = validateStructural(parsed);
    setStructuralErrors(structural.errors);

    if (structural.valid) {
      setQuizData(parsed);
      setWarnings(checkSchema(parsed));
      setLoadId((n) => n + 1);
    } else {
      setQuizData(null);
      setWarnings([]);
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
        <QuizReviewImport key={loadId} courseId={courseId} quizId={quizId} quiz={quizData} warnings={warnings} />
      )}
    </div>
  );
}
