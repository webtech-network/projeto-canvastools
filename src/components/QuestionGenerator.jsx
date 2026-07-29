'use client';

import { useState } from 'react';
import Link from 'next/link';

const NIVEL_OPTIONS = [
  { value: 'baixo', label: 'Baixo' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'alto', label: 'Alto' },
];

const TIPO_OPTIONS = [
  { value: 'RU', label: 'RU — Resposta Única' },
  { value: 'CM', label: 'CM — Complementação Múltipla' },
  { value: 'AR', label: 'AR — Asserção-Razão' },
];

function emptySpec() {
  return { quantidade: 1, tema: '', nivel: 'intermediario', tipo: 'RU' };
}

// Preview-only: strips HTML tags down to plain text via the browser's own HTML
// parser (never executes scripts). The saved JSON file keeps the real HTML —
// this app has no sanitization tooling, so raw HTML from generated content is
// never injected into the DOM.
function stripHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

export default function QuestionGenerator({ hasApiKey }) {
  const [specs, setSpecs] = useState([emptySpec()]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [warningsOpen, setWarningsOpen] = useState(false);

  function updateSpec(index, field, value) {
    setSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addSpec() {
    setSpecs((prev) => [...prev, emptySpec()]);
  }

  function removeSpec(index) {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    setQuiz(null);
    setWarnings([]);

    try {
      const response = await fetch('/api/ai/openai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specs }),
      });
      const data = await response.json();
      if (!response.ok) {
        setGenerateError(data.error || 'Falha ao gerar questões.');
      } else {
        setQuiz(data.quiz);
        setWarnings(data.warnings || []);
      }
    } catch (err) {
      setGenerateError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleSaveFile() {
    if (!quiz) return;
    const blob = new Blob([JSON.stringify(quiz, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questoes-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const specsValid = specs.length > 0 && specs.every((s) => s.tema.trim() && Number(s.quantidade) >= 1);
  const totalQuestions = specs.reduce((sum, s) => sum + (Number(s.quantidade) || 0), 0);

  return (
    <div className="question-generator">
      {!hasApiKey ? (
        <div className="alert alert-warning">
          Configure sua chave de API da OpenAI em <Link href="/perfil">seu perfil</Link> para gerar questões.
        </div>
      ) : (
        <>
          <div className="spec-list-header">
            <span>Num. de Questões</span>
            <span>Tema</span>
            <span>Complexidade</span>
            <span>Tipo de Questão</span>
          </div>
          <div className="spec-list">
            {specs.map((spec, i) => (
              <div key={i} className="spec-row">
                <input
                  type="number"
                  min="1"
                  step="1"
                  aria-label="Número de questões"
                  value={spec.quantidade}
                  onChange={(e) => updateSpec(i, 'quantidade', Number(e.target.value))}
                />
                <input
                  type="text"
                  placeholder="Tema (ex.: Normalização de banco de dados)"
                  value={spec.tema}
                  onChange={(e) => updateSpec(i, 'tema', e.target.value)}
                />
                <select value={spec.nivel} onChange={(e) => updateSpec(i, 'nivel', e.target.value)}>
                  {NIVEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select value={spec.tipo} onChange={(e) => updateSpec(i, 'tipo', e.target.value)}>
                  {TIPO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={specs.length === 1}
                  onClick={() => removeSpec(i)}
                  aria-label="Remover questão"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-secondary btn-sm" onClick={addSpec}>
            + Adicionar questão
          </button>

          <div className="generate-actions">
            <button type="button" className="btn btn-primary" disabled={!specsValid || generating} onClick={handleGenerate}>
              {generating ? 'Gerando…' : `Gerar questões (${totalQuestions})`}
            </button>
            {generating && <span className="lede">Gerando… pode levar até um minuto.</span>}
          </div>
        </>
      )}

      {generateError && <div className="alert alert-error">{generateError}</div>}

      {quiz && (
        <div className="quiz-preview">
          <div className="alert alert-warning">
            course_id/quiz_id vêm como <code>0</code> (placeholders) — o curso/quiz real é definido no fluxo de
            importação, ao enviar este arquivo.
          </div>

          {warnings.length > 0 && (
            <div className="alert alert-warning">
              <button type="button" className="alert-toggle" onClick={() => setWarningsOpen((v) => !v)}>
                {warningsOpen ? '▾' : '▸'} {warnings.length} aviso(s) de formatação (não impedem o uso)
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

          {quiz.questions.map((q, i) => (
            <article key={i} className="page question-preview">
              <h3>{q.question_name}</h3>
              <p>{stripHtml(q.question_text)}</p>
              <ul>
                {(q.answers || []).map((a, j) => (
                  <li key={j}>
                    {a.is_correct ? <strong>[Correta] </strong> : null}
                    {a.answer_text}
                    {a.answer_comment && <div className="lede">{stripHtml(a.answer_comment)}</div>}
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <button type="button" className="btn btn-primary" onClick={handleSaveFile}>
            Salvar arquivo
          </button>
        </div>
      )}
    </div>
  );
}
