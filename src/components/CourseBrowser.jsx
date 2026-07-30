'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import StatusIcon from './StatusIcon';
import SortIcon from './SortIcon';

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

function MessagesIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <path d="M3.5 6.5l8.5 6 8.5-6" />
    </svg>
  );
}

const STATUS_ORDER = { published: 0, unpublished: 1, completed: 2 };

const SORTERS = {
  favorite: (course) => (course.is_favorite ? 0 : 1),
  name: (course) => course.name?.toLowerCase() ?? '',
  pending: (course) => course.needs_grading_count ?? 0,
  status: (course) => STATUS_ORDER[toStatus(course.workflow_state)] ?? 99,
  messages: (course) => course.message_count ?? -1,
};

// A 'completed' course was published before being concluded, so it belongs
// in the "Publicados" bucket, not "Não publicados" — only Canvas's own
// 'unpublished' state means the course was never published.
function isPublished(course) {
  return course.workflow_state !== 'unpublished';
}

const STATUS_FILTERS = [
  { key: 'all', label: 'Qualquer status' },
  { key: 'published', label: 'Publicados' },
  { key: 'unpublished', label: 'Não publicados' },
];

export default function CourseBrowser({ courses }) {
  const [courseList, setCourseList] = useState(courses);
  const [query, setQuery] = useState('');
  // Starts on "Favoritos" by default (per product decision), but falls back to
  // "Todos" when the account has no favorited/starred courses in Canvas, so
  // the first screen is never an empty dead end.
  const [onlyFavorites, setOnlyFavorites] = useState(() => courses.some((c) => c.is_favorite));
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [pendingFavoriteId, setPendingFavoriteId] = useState(null);
  const [favoriteError, setFavoriteError] = useState(null);

  const favoritesCount = useMemo(() => courseList.filter((c) => c.is_favorite).length, [courseList]);
  const publishedCount = useMemo(() => courseList.filter(isPublished).length, [courseList]);
  const unpublishedCount = courseList.length - publishedCount;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return courseList.filter((course) => {
      if (onlyFavorites && !course.is_favorite) return false;
      if (statusFilter === 'published' && !isPublished(course)) return false;
      if (statusFilter === 'unpublished' && isPublished(course)) return false;
      if (!term) return true;
      return (
        course.name?.toLowerCase().includes(term) || course.course_code?.toLowerCase().includes(term)
      );
    });
  }, [courseList, query, onlyFavorites, statusFilter]);

  async function toggleFavorite(course) {
    const nextFavorite = !course.is_favorite;
    setPendingFavoriteId(course.id);
    setFavoriteError(null);
    setCourseList((prev) => prev.map((c) => (c.id === course.id ? { ...c, is_favorite: nextFavorite } : c)));

    try {
      const response = await fetch(`/api/canvas/courses/${course.id}/favorite`, {
        method: nextFavorite ? 'POST' : 'DELETE',
      });
      if (!response.ok) throw new Error();
    } catch {
      setCourseList((prev) => prev.map((c) => (c.id === course.id ? { ...c, is_favorite: course.is_favorite } : c)));
      setFavoriteError(`Não foi possível ${nextFavorite ? 'favoritar' : 'desfavoritar'} "${course.name}". Tente novamente.`);
    } finally {
      setPendingFavoriteId(null);
    }
  }

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const getValue = SORTERS[sort.key];
    const sign = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va < vb) return -1 * sign;
      if (va > vb) return 1 * sign;
      return 0;
    });
  }, [filtered, sort]);

  function toggleSort(key) {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  }

  function sortAria(key) {
    if (sort.key !== key) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

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
        <div className="segmented" role="group" aria-label="Filtrar por favorito">
          <button
            type="button"
            className={`segmented-btn${!onlyFavorites ? ' active' : ''}`}
            onClick={() => setOnlyFavorites(false)}
          >
            Todos ({courseList.length})
          </button>
          <button
            type="button"
            className={`segmented-btn${onlyFavorites ? ' active' : ''}`}
            onClick={() => setOnlyFavorites(true)}
          >
            ★ Favoritos ({favoritesCount})
          </button>
        </div>
        <div className="segmented" role="group" aria-label="Filtrar por status de publicação">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`segmented-btn${statusFilter === key ? ' active' : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              {label} (
              {key === 'all' ? courseList.length : key === 'published' ? publishedCount : unpublishedCount})
            </button>
          ))}
        </div>
      </div>

      {favoriteError && (
        <p className="alert alert-error" role="alert">
          {favoriteError}
        </p>
      )}

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
              <th aria-sort={sortAria('favorite')}>
                <button type="button" className="th-sort-btn" onClick={() => toggleSort('favorite')}>
                  <span className="sr-only">Favorito</span>
                  <SortIcon direction={sort.key === 'favorite' ? sort.direction : null} />
                </button>
              </th>
              <th aria-sort={sortAria('name')}>
                <button type="button" className="th-sort-btn" onClick={() => toggleSort('name')}>
                  Curso
                  <SortIcon direction={sort.key === 'name' ? sort.direction : null} />
                </button>
              </th>
              <th aria-sort={sortAria('pending')}>
                <button type="button" className="th-sort-btn" onClick={() => toggleSort('pending')}>
                  Pendências
                  <SortIcon direction={sort.key === 'pending' ? sort.direction : null} />
                </button>
              </th>
              <th aria-sort={sortAria('status')}>
                <button type="button" className="th-sort-btn" onClick={() => toggleSort('status')}>
                  <span className="col-emoji" aria-hidden="true">📢</span>
                  <span className="sr-only">Status de publicação</span>
                  <SortIcon direction={sort.key === 'status' ? sort.direction : null} />
                </button>
              </th>
              <th aria-sort={sortAria('messages')}>
                <button type="button" className="th-sort-btn" onClick={() => toggleSort('messages')}>
                  <span className="col-emoji" aria-hidden="true">✉️</span>
                  <span className="sr-only">Mensagens</span>
                  <SortIcon direction={sort.key === 'messages' ? sort.direction : null} />
                </button>
              </th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((course) => (
              <tr key={course.id}>
                <td className="fav-cell">
                  <button
                    type="button"
                    className={`fav-toggle-btn${course.is_favorite ? ' is-favorite' : ''}`}
                    onClick={() => toggleFavorite(course)}
                    disabled={pendingFavoriteId === course.id}
                    title={course.is_favorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
                    aria-label={course.is_favorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
                    aria-pressed={course.is_favorite}
                  >
                    ★
                  </button>
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
                <td className="pending-cell">
                  {course.message_count === undefined ? (
                    <span className="pending-badge" title="Só cursos favoritos têm mensagens carregadas">
                      —
                    </span>
                  ) : course.message_count === null ? (
                    <span className="pending-badge" title="Não foi possível carregar as mensagens">
                      —
                    </span>
                  ) : (
                    <span className={`pending-badge${course.message_count ? ' has-pending' : ''}`}>
                      {course.message_count}
                    </span>
                  )}
                </td>
                <td className="actions-cell">
                  <Link
                    href={`/courses/${course.id}/atividades`}
                    className="btn btn-primary btn-icon"
                    title="Ver atividades"
                    aria-label="Ver atividades"
                  >
                    <ActivitiesIcon />
                  </Link>
                  <Link
                    href={`/courses/${course.id}/mensagens`}
                    className="btn btn-secondary btn-icon"
                    title="Ver mensagens"
                    aria-label="Ver mensagens"
                  >
                    <MessagesIcon />
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
