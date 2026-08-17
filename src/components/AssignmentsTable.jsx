'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  ListPlus,
  CircleCheckBig,
  CircleDashed,
  ExternalLink,
} from 'lucide-react';
import StatusIcon from './StatusIcon';

function formatDueDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function isPastDue(iso) {
  if (!iso) return false;
  const dueAt = new Date(iso);
  return !Number.isNaN(dueAt.getTime()) && dueAt.getTime() < Date.now();
}

// Preview-only plain-text rendering of the assignment's HTML description —
// same reasoning as QuestionGenerator.jsx's stripHtml: this app has zero
// HTML-sanitization tooling, so raw Canvas HTML is never injected via
// dangerouslySetInnerHTML. Joins top-level block elements (paragraphs,
// lists, etc.) with blank lines so multi-paragraph descriptions don't run
// together into one unreadable line.
function descriptionToPlainText(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks = doc.body.children.length > 0 ? Array.from(doc.body.children) : [doc.body];
  return blocks
    .map((el) => el.textContent.trim())
    .filter(Boolean)
    .join('\n\n');
}

const STATUS_FILTERS = [
  { key: 'published', label: 'Publicadas' },
  { key: 'unpublished', label: 'Não publicadas' },
  { key: 'all', label: 'Todas' },
];

// Defaults to "Publicadas" — same convention as CourseBrowser.jsx's own
// status filter (unpublished items usually aren't what a professor is
// looking for on first load; "Todas" is still one click away).
export default function AssignmentsTable({ courseId, assignments }) {
  const [statusFilter, setStatusFilter] = useState('published');
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  function toggleExpanded(assignmentId) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assignmentId)) next.delete(assignmentId);
      else next.add(assignmentId);
      return next;
    });
  }

  const publishedCount = useMemo(() => assignments.filter((a) => a.published).length, [assignments]);
  const unpublishedCount = assignments.length - publishedCount;

  const filtered = useMemo(() => {
    return assignments.filter((assignment) => {
      if (statusFilter === 'published' && !assignment.published) return false;
      if (statusFilter === 'unpublished' && assignment.published) return false;
      return true;
    });
  }, [assignments, statusFilter]);

  if (assignments.length === 0) {
    return <p>Nenhuma atividade encontrada neste curso.</p>;
  }

  return (
    <>
      <div className="browser-controls">
        <div className="segmented" role="group" aria-label="Filtrar por status de publicação">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`segmented-btn${statusFilter === key ? ' active' : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              {label} ({key === 'all' ? assignments.length : key === 'published' ? publishedCount : unpublishedCount})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="lede">Nenhuma atividade encontrada com esse filtro.</p>
      ) : (
        <>
          <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <span className="sr-only">Expandir</span>
                </th>
                <th>
                  <span className="sr-only">Status</span>
                </th>
                <th>Atividade</th>
                <th>Valor</th>
                <th>Data de entrega</th>
                <th title="Correções pendentes">
                  <ClipboardCheck size={16} strokeWidth={1.8} className="col-icon" aria-hidden="true" />
                  <span className="sr-only">Correções pendentes</span>
                </th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((assignment) => {
                const expanded = expandedIds.has(assignment.id);
                return (
                  <Fragment key={assignment.id}>
                    <tr>
                      <td className="expand-cell">
                        <button
                          type="button"
                          className="row-expand-btn"
                          onClick={() => toggleExpanded(assignment.id)}
                          aria-expanded={expanded}
                          aria-label={expanded ? 'Recolher enunciado' : 'Expandir enunciado'}
                        >
                          <span className={`group-chevron${expanded ? ' expanded' : ''}`} aria-hidden="true">
                            <ChevronRight size={16} strokeWidth={2} />
                          </span>
                        </button>
                      </td>
                      <td className="status-cell">
                        <StatusIcon status={assignment.published ? 'published' : 'unpublished'} />
                      </td>
                      <td className="course-name-cell">
                        <button
                          type="button"
                          className="subject-toggle-btn"
                          onClick={() => toggleExpanded(assignment.id)}
                          aria-expanded={expanded}
                        >
                          {assignment.name}
                        </button>
                        <a
                          href={assignment.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="external-link-icon"
                          title="Abrir atividade no Canvas"
                          aria-label="Abrir atividade no Canvas"
                        >
                          <ExternalLink size={14} strokeWidth={1.8} />
                        </a>
                      </td>
                      <td className="pending-cell">
                        {assignment.points_possible != null ? `${assignment.points_possible} pts` : '—'}
                      </td>
                      <td className={`pending-cell${isPastDue(assignment.due_at) ? ' is-past-due' : ''}`}>
                        {formatDueDate(assignment.due_at)}
                      </td>
                      <td className="pending-cell">
                        {assignment.needs_grading_count ? (
                          <span className="pending-badge has-pending">{assignment.needs_grading_count}</span>
                        ) : null}
                      </td>
                      <td className="actions-cell">
                        {/* Always shown — unlike quiz_id, whether an assignment has
                            a rubric isn't known from this list response, so the
                            grading page itself handles the "sem rubrica" case. */}
                        <Link
                          href={`/courses/${courseId}/assignments/${assignment.id}/grade`}
                          className="btn btn-primary btn-icon"
                          title="Correção de Atividade"
                          aria-label="Correção de Atividade"
                        >
                          <ClipboardList size={18} strokeWidth={1.8} />
                        </Link>
                        {/* Only classic quizzes (assignment.quiz_id) can receive imported
                            questions — New Quizzes (is_quiz_assignment) and regular
                            assignments intentionally get no action here. */}
                        {assignment.quiz_id && (
                          <Link
                            href={`/courses/${courseId}/quizzes/${assignment.quiz_id}/import`}
                            className="btn btn-primary btn-icon"
                            title="Importar questões"
                            aria-label="Importar questões"
                          >
                            <ListPlus size={18} strokeWidth={1.8} />
                          </Link>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="message-detail-row">
                        <td colSpan={7}>
                          <div className="message-detail">
                            {assignment.description ? (
                              <p className="message-detail-text">{descriptionToPlainText(assignment.description)}</p>
                            ) : (
                              <p className="lede">Esta atividade não tem enunciado.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>

          <ul className="icon-legend">
            <li>
              <CircleCheckBig size={14} strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--ok)' }} /> Publicado
            </li>
            <li>
              <CircleDashed size={14} strokeWidth={1.8} aria-hidden="true" /> Não publicado
            </li>
            <li>
              <ClipboardCheck size={14} strokeWidth={1.8} aria-hidden="true" /> Correções pendentes
            </li>
          </ul>
        </>
      )}
    </>
  );
}
