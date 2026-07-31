'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ListChecks, Mail, Star, Megaphone, ClipboardCheck, Users, RefreshCw } from 'lucide-react';
import StatusIcon from './StatusIcon';
import SortIcon from './SortIcon';
import { isPublished } from '@/lib/dashboard';
import { readCache, writeCache } from '@/lib/dashboardCache';

const CACHE_KEY = 'courses:list';

function formatDateTime(timestamp) {
  if (!timestamp) return null;
  try {
    return new Date(timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
  } catch {
    return null;
  }
}

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

export default function CourseBrowser() {
  const [courseList, setCourseList] = useState([]);
  const [query, setQuery] = useState('');
  // Starts on "Favoritos" by default (per product decision), but falls back to
  // "Todos" when the account has no favorited/starred courses in Canvas, so
  // the first screen is never an empty dead end. Data now arrives
  // asynchronously (cache first, then a fresh fetch), so this default is
  // resolved once — via applyDefaultFavoriteFilter below — the first time
  // either one lands, instead of synchronously from a prop like before.
  const [onlyFavorites, setOnlyFavorites] = useState(true);
  // Defaults to "Publicados" — unpublished courses aren't usually what a
  // professor is looking for on first load; "Todos" is still one click away.
  const [statusFilter, setStatusFilter] = useState('published');
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [pendingFavoriteId, setPendingFavoriteId] = useState(null);
  const [favoriteError, setFavoriteError] = useState(null);

  // Stale-while-revalidate: paints instantly from IndexedDB (marked `stale`),
  // then always fires a fresh fetch and updates the UI + cache when it
  // resolves. First-ever visit (no cache at all) shows a loading state
  // instead of an empty table.
  const [loading, setLoading] = useState(true);
  const [hasCache, setHasCache] = useState(false);
  const [stale, setStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const appliedDefaultFilterRef = useRef(false);
  const userToggledFavoritesRef = useRef(false);

  function applyDefaultFavoriteFilter(list) {
    if (appliedDefaultFilterRef.current || userToggledFavoritesRef.current) return;
    appliedDefaultFilterRef.current = true;
    if (!list.some((c) => c.is_favorite)) setOnlyFavorites(false);
  }

  const fetchFresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/canvas/courses');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao carregar os cursos.');
      setCourseList(data.courses);
      setFetchedAt(Date.now());
      setHasCache(true);
      setStale(false);
      setLoadError(null);
      applyDefaultFavoriteFilter(data.courses);
      await writeCache(CACHE_KEY, data.courses);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFromCache() {
      const cached = await readCache(CACHE_KEY);
      if (cancelled || !cached) return;
      setCourseList(cached.data);
      setFetchedAt(cached.fetchedAt);
      setHasCache(true);
      setStale(true);
      setLoading(false);
      applyDefaultFavoriteFilter(cached.data);
    }

    loadFromCache();
    fetchFresh();

    return () => {
      cancelled = true;
    };
  }, [fetchFresh]);

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
      // Keep the cache in sync with the optimistic update so the next
      // stale-while-revalidate paint (e.g. after a fresh page load) doesn't
      // briefly flash the pre-toggle favorite state before the fresh fetch
      // overwrites it.
      setCourseList((prev) => {
        const updated = prev.map((c) => (c.id === course.id ? { ...c, is_favorite: nextFavorite } : c));
        writeCache(CACHE_KEY, updated);
        return updated;
      });
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

  function handleSetOnlyFavorites(value) {
    userToggledFavoritesRef.current = true;
    setOnlyFavorites(value);
  }

  // Nothing to show yet at all (no cache, first fetch still in flight) —
  // the filter controls below would be meaningless with an empty list.
  if (loading && !hasCache) {
    return (
      <div className="course-browser">
        <p className="lede">Carregando cursos…</p>
      </div>
    );
  }

  if (!loading && courseList.length === 0) {
    return (
      <div className="course-browser">
        {loadError ? (
          <p className="alert alert-error" role="alert">
            {loadError}
          </p>
        ) : (
          <p className="lede">Nenhum curso encontrado para esta conta.</p>
        )}
      </div>
    );
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
            onClick={() => handleSetOnlyFavorites(true)}
          >
            <Star size={14} strokeWidth={2} fill="currentColor" aria-hidden="true" />
            Favoritos ({favoritesCount})
          </button>
          <button
            type="button"
            className={`segmented-btn${!onlyFavorites ? ' active' : ''}`}
            onClick={() => handleSetOnlyFavorites(false)}
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

      <div className="cache-footer">
        <span className="cache-footer-info">
          {fetchedAt
            ? `Carregado em ${formatDateTime(fetchedAt)}${stale ? ' — dados salvos, atualizando em segundo plano…' : ''}`
            : 'Carregando…'}
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={fetchFresh} disabled={loading}>
          <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
          {loading ? 'Atualizando…' : 'Recarregar'}
        </button>
      </div>

      {loadError && (
        <p className="alert alert-error" role="alert">
          {loadError}
        </p>
      )}
    </div>
  );
}
