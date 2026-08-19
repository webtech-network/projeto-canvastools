import { dbGetAll, dbGet, dbPut, dbDelete, dbUpdate, STORE_TASKS } from '../indexedDb';

export const STATUSES = ['BACKLOG', 'TODO', 'DOING', 'BLOCK', 'DONE'];

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

export async function listAllTags() {
  const tasks = await listTasks();
  const tags = new Set();
  for (const task of tasks) {
    for (const tag of task.tags || []) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}
