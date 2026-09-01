'use client';

import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import {
  listTasks,
  getTask as repoGetTask,
  createTask as repoCreateTask,
  updateTask as repoUpdateTask,
  deleteTask as repoDeleteTask,
  setTaskStatus as repoSetTaskStatus,
  setTaskPriority as repoSetTaskPriority,
} from '@/lib/workspace/tasksRepo';
import {
  listProjects,
  createProject as repoCreateProject,
  updateProject as repoUpdateProject,
  deleteProject as repoDeleteProject,
} from '@/lib/workspace/projectsRepo';
import { EMPTY_FILTERS } from '@/lib/workspace/filters';
import { scheduleWorkspaceSync, flushWorkspaceSyncNow } from '@/lib/sync/workspaceSyncScheduler';
import { subscribeSyncStatus, getSyncStatusSnapshot } from '@/lib/sync/syncStatusStore';
import { resolveWorkspacePreferences, patchSessionOverride } from '@/lib/workspace/workspacePreferences';

const WorkspaceContext = createContext(null);

const initialState = {
  tasks: [],
  projects: [],
  filters: EMPTY_FILTERS,
  view: 'kanban',
  cardDensity: 'expanded',
  collapsedColumns: [],
  groupByProject: false,
  loading: true,
};

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, tasks: action.tasks, projects: action.projects, loading: false };
    case 'TASK_UPSERT': {
      const exists = state.tasks.some((t) => t.id === action.task.id);
      const tasks = exists
        ? state.tasks.map((t) => (t.id === action.task.id ? action.task : t))
        : [...state.tasks, action.task];
      return { ...state, tasks };
    }
    // Merges against whatever `state.tasks` is at the moment this action is
    // actually processed by the reducer — not a snapshot captured by a
    // useCallback closure — so two rapid patches to the same task (e.g. a
    // Kanban status drag and an Eisenhower priority drag) never clobber each
    // other on the React-state side (see tasksRepo.js's updateTask for the
    // matching IndexedDB-side fix).
    case 'TASK_PATCH':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t)),
      };
    case 'TASK_REMOVE':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'PROJECT_UPSERT': {
      const exists = state.projects.some((p) => p.id === action.project.id);
      const projects = exists
        ? state.projects.map((p) => (p.id === action.project.id ? action.project : p))
        : [...state.projects, action.project];
      return { ...state, projects };
    }
    case 'PROJECT_REMOVE':
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        tasks: state.tasks.map((t) => (t.projectId === action.id ? { ...t, projectId: null } : t)),
      };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.filters } };
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'SET_DENSITY':
      return { ...state, cardDensity: action.density };
    case 'SET_COLLAPSED_COLUMNS':
      return { ...state, collapsedColumns: action.columns };
    case 'SET_GROUP_BY_PROJECT':
      return { ...state, groupByProject: action.groupByProject };
    default:
      return state;
  }
}

// Wraps /tarefas' content only (mounted in tarefas/page.jsx, not the
// dashboard layout) — this feature's state has no reason to survive
// navigation to other routes, so IndexedDB is read once per visit.
//
// Local-first flow for every mutation: the repo function (tasksRepo.js/
// projectsRepo.js) awaits the IndexedDB write first, then the resolved
// record is dispatched into state — components never call dbPut/dbGet
// directly, and the UI never re-reads IndexedDB after the initial hydrate,
// only writes through it.
export function WorkspaceProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;
    async function hydrateFromLocal() {
      const [tasks, projects] = await Promise.all([listTasks(), listProjects()]);
      if (!cancelled) {
        dispatch({
          type: 'HYDRATE',
          tasks: tasks.filter((t) => !t.deletedAt),
          projects: projects.filter((p) => !p.deletedAt),
        });
      }
    }
    hydrateFromLocal();
    // "Ao acionar a interface, automaticamente deve disparar a
    // sincronização em background" — reconcile with Drive right away,
    // without blocking the local-first paint above. Silently a no-op if
    // Google isn't connected (see workspaceSyncScheduler.js).
    flushWorkspaceSyncNow();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-reads local IndexedDB whenever a workspace sync just completed —
  // picks up whatever mergeSyncWorkspace() reconciled (tasks/projects
  // created, edited or tombstoned on another device) without requiring a
  // page reload.
  useEffect(() => {
    let cancelled = false;
    let previousState = getSyncStatusSnapshot().workspace.state;
    const unsubscribe = subscribeSyncStatus(() => {
      const current = getSyncStatusSnapshot().workspace.state;
      if (current === 'synced' && previousState !== 'synced' && !cancelled) {
        Promise.all([listTasks(), listProjects()]).then(([tasks, projects]) => {
          if (!cancelled) {
            dispatch({
              type: 'HYDRATE',
              tasks: tasks.filter((t) => !t.deletedAt),
              projects: projects.filter((p) => !p.deletedAt),
            });
          }
        });
      }
      previousState = current;
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Read after mount only (like Sidebar.jsx's collapse preference) so the
  // server-rendered markup (initialState's hardcoded values, which match
  // FALLBACK_PREFERENCES) never mismatches the client's first paint.
  // Resolves the persistent default (edited in /perfil's Preferências tab)
  // merged with this tab's session override (see workspacePreferences.js) —
  // "abra com as configurações predefinidas" on a session's first visit,
  // then whatever was toggled directly on this screen for the rest of it.
  useEffect(() => {
    const prefs = resolveWorkspacePreferences();
    dispatch({ type: 'SET_DENSITY', density: prefs.cardDensity });
    dispatch({ type: 'SET_VIEW', view: prefs.view });
    dispatch({ type: 'SET_COLLAPSED_COLUMNS', columns: prefs.collapsedColumns });
    dispatch({ type: 'SET_GROUP_BY_PROJECT', groupByProject: prefs.groupByProject });
  }, []);

  const addTask = useCallback(async (title, projectId = null) => {
    const task = await repoCreateTask({ title, projectId });
    dispatch({ type: 'TASK_UPSERT', task });
    scheduleWorkspaceSync();
    return task;
  }, []);

  const editTask = useCallback(async (id, patch) => {
    const task = await repoUpdateTask(id, patch);
    if (task) {
      dispatch({ type: 'TASK_UPSERT', task });
      scheduleWorkspaceSync();
    }
    return task;
  }, []);

  const removeTask = useCallback(async (id) => {
    await repoDeleteTask(id);
    dispatch({ type: 'TASK_REMOVE', id });
    scheduleWorkspaceSync();
  }, []);

  // Optimistic: state updates immediately (drag feels instant) via
  // TASK_PATCH (merges against the latest reducer state, not a stale
  // closure — see the reducer case above), the IndexedDB write happens
  // alongside it. On the rare failure, the authoritative record is re-read
  // from IndexedDB rather than restoring a snapshot that may itself be
  // stale by then.
  const moveTaskStatus = useCallback((id, status) => {
    dispatch({ type: 'TASK_PATCH', id, patch: { status } });
    repoSetTaskStatus(id, status)
      .then(() => scheduleWorkspaceSync())
      .catch(async () => {
        const fresh = await repoGetTask(id);
        if (fresh) dispatch({ type: 'TASK_UPSERT', task: fresh });
      });
  }, []);

  const moveTaskPriority = useCallback((id, priority) => {
    dispatch({ type: 'TASK_PATCH', id, patch: { priority } });
    repoSetTaskPriority(id, priority)
      .then(() => scheduleWorkspaceSync())
      .catch(async () => {
        const fresh = await repoGetTask(id);
        if (fresh) dispatch({ type: 'TASK_UPSERT', task: fresh });
      });
  }, []);

  const addProject = useCallback(async ({ name, type, canvasReference = null, color = null }) => {
    const project = await repoCreateProject({ name, type, canvasReference, color });
    dispatch({ type: 'PROJECT_UPSERT', project });
    scheduleWorkspaceSync();
    return project;
  }, []);

  const editProject = useCallback(async (id, patch) => {
    const project = await repoUpdateProject(id, patch);
    if (project) {
      dispatch({ type: 'PROJECT_UPSERT', project });
      scheduleWorkspaceSync();
    }
    return project;
  }, []);

  const removeProject = useCallback(async (id) => {
    await repoDeleteProject(id);
    dispatch({ type: 'PROJECT_REMOVE', id });
    scheduleWorkspaceSync();
  }, []);

  // setView/setCardDensity/setColumnCollapsed/setStagesCollapsed below write
  // only to the session-tier override (workspacePreferences.js) — never to
  // the persistent default, which is only ever changed via /perfil's
  // Preferências tab (TarefasPreferences.jsx). "Ao alterar algo [na tela de
  // Tarefas], mantenha estas opções nas configurações de sessão que devem
  // sobrepor as configurações padrões durante a sessão." (setFilters below
  // doesn't persist at all — filters reset every visit.)
  const setFilters = useCallback((filters) => dispatch({ type: 'SET_FILTERS', filters }), []);
  const setView = useCallback((view) => {
    patchSessionOverride({ view });
    dispatch({ type: 'SET_VIEW', view });
  }, []);
  const setCardDensity = useCallback((density) => {
    patchSessionOverride({ cardDensity: density });
    dispatch({ type: 'SET_DENSITY', density });
  }, []);
  const setGroupByProject = useCallback((groupByProject) => {
    patchSessionOverride({ groupByProject });
    dispatch({ type: 'SET_GROUP_BY_PROJECT', groupByProject });
  }, []);
  // Closes/reopens a single Kanban column — the header close button (any
  // status) and the collapsed strip's click-to-expand (KanbanColumn.jsx)
  // both go through here.
  const setColumnCollapsed = useCallback(
    (status, collapsed) => {
      const next = collapsed
        ? Array.from(new Set([...state.collapsedColumns, status]))
        : state.collapsedColumns.filter((s) => s !== status);
      patchSessionOverride({ collapsedColumns: next });
      dispatch({ type: 'SET_COLLAPSED_COLUMNS', columns: next });
    },
    [state.collapsedColumns],
  );
  // Convenience batch action over the same collapsedColumns state — kept for
  // WorkspaceView.jsx's toolbar shortcut and TarefasPreferences.jsx's
  // persisted default, both of which still treat Backlog/Block as one pair.
  // Independent from per-column closes: collapsing Backlog on its own via
  // its header button doesn't affect Block, and vice versa.
  const setStagesCollapsed = useCallback(
    (collapsed) => {
      const next = collapsed
        ? Array.from(new Set([...state.collapsedColumns, 'BACKLOG', 'BLOCK']))
        : state.collapsedColumns.filter((s) => s !== 'BACKLOG' && s !== 'BLOCK');
      patchSessionOverride({ collapsedColumns: next });
      dispatch({ type: 'SET_COLLAPSED_COLUMNS', columns: next });
    },
    [state.collapsedColumns],
  );

  // For mutations that bypass the wrappers above and write to IndexedDB
  // directly (WorkspaceExportImport.jsx's file import, via
  // workspaceExport.js's replaceAllTasks/replaceAllProjects) — re-reads
  // local IndexedDB and re-hydrates state, same as the post-sync effect
  // above, but callable on demand instead of waiting for a sync transition.
  const refreshFromLocal = useCallback(async () => {
    const [tasks, projects] = await Promise.all([listTasks(), listProjects()]);
    dispatch({
      type: 'HYDRATE',
      tasks: tasks.filter((t) => !t.deletedAt),
      projects: projects.filter((p) => !p.deletedAt),
    });
  }, []);

  const value = {
    ...state,
    addTask,
    editTask,
    removeTask,
    moveTaskStatus,
    moveTaskPriority,
    addProject,
    editProject,
    removeProject,
    setFilters,
    setView,
    setCardDensity,
    setGroupByProject,
    setColumnCollapsed,
    setStagesCollapsed,
    refreshFromLocal,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
