import { dbGetAll, dbGet, dbPut, dbDelete, dbUpdate, STORE_TASKS } from '../indexedDb';

// Backlog and Block lead the board on purpose — they're the two "not
// actively being worked" stages (not yet planned, and blocked/stuck), kept
// together up front so the collapse toggle in WorkspaceView.jsx has a
// single contiguous pair of columns to fold away (see .kanban-board--
// stages-collapsed in globals.css, which assumes these are the first two).
export const STATUSES = ['BACKLOG', 'BLOCK', 'TODO', 'DOING', 'DONE'];

export async function listTasks() {
  return dbGetAll(STORE_TASKS);
}

export async function getTask(id) {
  return dbGet(STORE_TASKS, id);
}

// Quick-create (spec section 6): only a title is required. Every other
// field starts at a sensible empty default and is filled in later via
// updateTask from TaskDetailModal.jsx.
export async function createTask({ title, projectId = null }) {
  const now = Date.now();
  const task = {
    id: crypto.randomUUID(),
    title,
    description: '',
    status: 'BACKLOG',
    priority: { urgent: false, important: false },
    projectId,
    tags: [],
    dueDate: null,
    canvasReferences: null,
    createdAt: now,
    updatedAt: now,
  };
  await dbPut(STORE_TASKS, task);
  return task;
}

// Atomic read-modify-write (see indexedDb.js's dbUpdate) — two updates to
// the same task fired close together (e.g. a Kanban status drag and an
// Eisenhower priority drag) must not silently lose one of the changes.
export async function updateTask(id, patch) {
  const updated = await dbUpdate(STORE_TASKS, id, (existing) =>
    existing ? { ...existing, ...patch, updatedAt: Date.now() } : undefined,
  );
  return updated ?? null;
}

export async function deleteTask(id) {
  await dbDelete(STORE_TASKS, id);
}

export async function setTaskStatus(id, status) {
  return updateTask(id, { status });
}

export async function setTaskPriority(id, priority) {
  return updateTask(id, { priority });
}

// Replace, not merge — same reasoning as shortcuts.js's replaceAllShortcuts:
// ids pulled from Drive come from this same device's own prior push in the
// common case, but could in principle be a different device's
// crypto.randomUUID() sequence, so merging risks silent id collisions.
// Called only from workspace/workspaceDriveSync.js's pull path — never from
// WorkspaceProvider.jsx, so it never re-triggers scheduleWorkspaceSync().
export async function replaceAllTasks(tasksArray) {
  const existing = await listTasks();
  await Promise.all(existing.map((t) => dbDelete(STORE_TASKS, t.id)));
  const now = Date.now();
  await Promise.all(
    tasksArray.map((t) =>
      dbPut(STORE_TASKS, {
        id: typeof t.id === 'string' && t.id ? t.id : crypto.randomUUID(),
        title: t.title || '',
        description: t.description || '',
        status: STATUSES.includes(t.status) ? t.status : 'BACKLOG',
        priority: { urgent: Boolean(t.priority?.urgent), important: Boolean(t.priority?.important) },
        projectId: t.projectId ?? null,
        tags: Array.isArray(t.tags) ? t.tags : [],
        dueDate: t.dueDate ?? null,
        canvasReferences: t.canvasReferences ?? null,
        createdAt: t.createdAt ?? now,
        updatedAt: t.updatedAt ?? now,
      }),
    ),
  );
  return tasksArray.length;
}

export async function listAllTags() {
  const tasks = await listTasks();
  const tags = new Set();
  for (const task of tasks) {
    for (const tag of task.tags || []) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}
