'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ListChecks, Mail, Star, Megaphone, ClipboardCheck, Users } from 'lucide-react';
import StatusIcon from './StatusIcon';
import SortIcon from './SortIcon';
import { isPublished } from '@/lib/dashboard';

function toStatus(workflowState) {
  if (workflowState === 'available') return 'published';
  if (workflowState === 'completed') return 'completed';
  return 'unpublished';
}

const STATUS_ORDER = { published: 0, unpublished: 1, completed: 2 };

const SORTERS = {
  favorite: (course) => (course.is_favorite ? 0 : 1),
  name: (course) => course.name?.toLowerCase() ?? '',
  pending: (course) => course.needs_grading_count ?? 0,
  status: (course) => STATUS_ORDER[toStatus(course.workflow_state)] ?? 99,
  messages: (course) => course.message_count ?? -1,
};

const STATUS_FILTERS = [
  { key: 'published', label: 'Publicados' },
  { key: 'unpublished', label: 'Não publicados' },
  { key: 'all', label: 'Todos' },
];

export default function CourseBrowser({ courses }) {
  const [courseList, setCourseList] = useState(courses);
  const [query, setQuery] = useState('');
  // Starts on "Favoritos" by default (per product decision), but falls back to
  // "Todos" when the account has no favorited/starred courses in Canvas, so
  // the first screen is never an empty dead end.
  const [onlyFavorites, setOnlyFavorites] = useState(() => courses.some((c) => c.is_favorite));
  // Defaults to "Publicados" — unpublished courses aren't usually what a
  // professor is looking for on first load; "Todos" is still one click away.
  const [statusFilter, setStatusFilter] = useState('published');
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
            className={`segmented-btn${onlyFavorites ? ' active' : ''}`}
            onClick={() => setOnlyFavorites(true)}
          >
            <Star size={14} strokeWidth={2} fill="currentColor" aria-hidden="true" />
            Favoritos ({favoritesCount})
          </button>
          <button
            type="button"
            className={`segmented-btn${!onlyFavorites ? ' active' : ''}`}
            onClick={() => setOnlyFavorites(false)}
          >
            Todos ({courseList.length})
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
        <>
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
                <button
                  type="button"
                  className="th-sort-btn"
                  onClick={() => toggleSort('pending')}
                  title="Correções pendentes"
                >
                  <ClipboardCheck size={16} strokeWidth={1.8} className="col-icon" aria-hidden="true" />
                  <span className="sr-only">Correções pendentes</span>
                  <SortIcon direction={sort.key === 'pending' ? sort.direction : null} />
                </button>
              </th>
              <th aria-sort={sortAria('status')}>
                <button
                  type="button"
                  className="th-sort-btn"
                  onClick={() => toggleSort('status')}
                  title="Status de publicação"
                >
                  <Megaphone size={16} strokeWidth={1.8} className="col-icon" aria-hidden="true" />
                  <span className="sr-only">Status de publicação</span>
                  <SortIcon direction={sort.key === 'status' ? sort.direction : null} />
                </button>
              </th>
              <th aria-sort={sortAria('messages')}>
                <button
                  type="button"
                  className="th-sort-btn"
                  onClick={() => toggleSort('messages')}
                  title="Mensagens"
                >
                  <Mail size={16} strokeWidth={1.8} className="col-icon" aria-hidden="true" />
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
                    <Star size={16} strokeWidth={1.8} fill={course.is_favorite ? 'currentColor' : 'none'} />
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
                    <ListChecks size={18} strokeWidth={1.8} />
                  </Link>
                  <Link
                    href={`/courses/${course.id}/mensagens`}
                    className="btn btn-secondary btn-icon"
                    title="Ver mensagens"
                    aria-label="Ver mensagens"
                  >
                    <Mail size={18} strokeWidth={1.8} />
                  </Link>
                  <Link
                    href={`/courses/${course.id}/alunos`}
                    className="btn btn-secondary btn-icon"
                    title="Ver alunos"
                    aria-label="Ver alunos"
                  >
                    <Users size={18} strokeWidth={1.8} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="icon-legend">
          <li>
            <Star size={14} strokeWidth={1.8} fill="currentColor" aria-hidden="true" /> Favorito
          </li>
          <li>
            <ClipboardCheck size={14} strokeWidth={1.8} aria-hidden="true" /> Correções pendentes
          </li>
          <li>
            <Megaphone size={14} strokeWidth={1.8} aria-hidden="true" /> Status de publicação
          </li>
          <li>
            <Mail size={14} strokeWidth={1.8} aria-hidden="true" /> Mensagens
          </li>
        </ul>
        </>
      )}
    </div>
  );
}
