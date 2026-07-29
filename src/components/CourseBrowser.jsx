'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import StatusIcon from './StatusIcon';

function toStatus(workflowState) {
  if (workflowState === 'available') return 'published';
  if (workflowState === 'completed') return 'completed';
  return 'unpublished';
}

function ActivitiesIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="4.5" cy="6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.1" fill="currentColor" stroke="none" />
      <line x1="8.5" y1="6" x2="20" y2="6" />
      <line x1="8.5" y1="12" x2="20" y2="12" />
      <line x1="8.5" y1="18" x2="20" y2="18" />
    </svg>
  );
}

export default function CourseBrowser({ courses }) {
  const [query, setQuery] = useState('');
  // Starts on "Favoritos" by default (per product decision), but falls back to
  // "Todos" when the account has no favorited/starred courses in Canvas, so
  // the first screen is never an empty dead end.
  const [onlyFavorites, setOnlyFavorites] = useState(() => courses.some((c) => c.is_favorite));

  const favoritesCount = useMemo(() => courses.filter((c) => c.is_favorite).length, [courses]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return courses.filter((course) => {
      if (onlyFavorites && !course.is_favorite) return false;
      if (!term) return true;
      return (
        course.name?.toLowerCase().includes(term) || course.course_code?.toLowerCase().includes(term)
      );
    });
  }, [courses, query, onlyFavorites]);

  return (
    <div className="course-browser">
      <div className="browser-controls">
        <input
          type="search"
          className="search-input"
          placeholder="Pesquisar por nome ou código..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Pesquisar cursos"
        />
        <div className="segmented" role="group" aria-label="Filtrar cursos">
          <button
            type="button"
            className={`segmented-btn${!onlyFavorites ? ' active' : ''}`}
            onClick={() => setOnlyFavorites(false)}
          >
            Todos ({courses.length})
          </button>
          <button
            type="button"
            className={`segmented-btn${onlyFavorites ? ' active' : ''}`}
            onClick={() => setOnlyFavorites(true)}
          >
            ★ Favoritos ({favoritesCount})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="lede">
          {onlyFavorites && favoritesCount === 0
            ? 'Você ainda não marcou nenhum curso como favorito/em destaque no Canvas.'
            : 'Nenhum curso encontrado com esse filtro ou pesquisa.'}
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <span className="sr-only">Favorito</span>
              </th>
              <th>Curso</th>
              <th>Pendências</th>
              <th>
                <span className="sr-only">Status</span>
              </th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((course) => (
              <tr key={course.id}>
                <td className="fav-cell">
                  {course.is_favorite && (
                    <span className="favorite-star" title="Favorito">
                      ★
                    </span>
                  )}
                </td>
                <td className="course-name-cell">
                  <a href={course.html_url} target="_blank" rel="noopener noreferrer" title="Abrir curso no Canvas">
                    {course.name}
                  </a>
                </td>
                <td className="pending-cell">
                  <span className={`pending-badge${course.needs_grading_count ? ' has-pending' : ''}`}>
                    {course.needs_grading_count ?? 0}
                  </span>
                </td>
                <td className="status-cell">
                  <StatusIcon status={toStatus(course.workflow_state)} />
                </td>
                <td className="actions-cell">
                  {/* Only one action exists today; more per-course actions are expected
                      to join this cell later, which is why it's a plain flex-ready cell
                      rather than a single hardcoded link. */}
                  <Link
                    href={`/courses/${course.id}/atividades`}
                    className="btn btn-primary btn-icon"
                    title="Ver atividades"
                    aria-label="Ver atividades"
                  >
                    <ActivitiesIcon />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
