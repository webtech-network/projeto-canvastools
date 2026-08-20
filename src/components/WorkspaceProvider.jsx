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

const WorkspaceContext = createContext(null);

const DENSITY_STORAGE_KEY = 'canvastools:workspace-card-density';
const STAGES_COLLAPSED_STORAGE_KEY = 'canvastools:workspace-stages-collapsed';

const initialState = {
  tasks: [],
  projects: [],
  filters: EMPTY_FILTERS,
  view: 'kanban',
  cardDensity: 'expanded',
  stagesCollapsed: false,
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
    case 'SET_STAGES_COLLAPSED':
      return { ...state, stagesCollapsed: action.collapsed };
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
  // server-rendered ('expanded') markup matches the client's first paint.
  useEffect(() => {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    if (stored === 'condensed' || stored === 'expanded') {
      dispatch({ type: 'SET_DENSITY', density: stored });
    }
    if (window.localStorage.getItem(STAGES_COLLAPSED_STORAGE_KEY) === '1') {
      dispatch({ type: 'SET_STAGES_COLLAPSED', collapsed: true });
    }
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

  const addProject = useCallback(async ({ name, type, canvasReference = null }) => {
    const project = await repoCreateProject({ name, type, canvasReference });
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

  const setFilters = useCallback((filters) => dispatch({ type: 'SET_FILTERS', filters }), []);
  const setView = useCallback((view) => dispatch({ type: 'SET_VIEW', view }), []);
  const setCardDensity = useCallback((density) => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
    dispatch({ type: 'SET_DENSITY', density });
  }, []);
  const setStagesCollapsed = useCallback((collapsed) => {
    window.localStorage.setItem(STAGES_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
    dispatch({ type: 'SET_STAGES_COLLAPSED', collapsed });
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
    setStagesCollapsed,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
