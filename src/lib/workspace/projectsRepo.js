import { dbGetAll, dbGet, dbPut, dbDelete, dbUpdate, STORE_PROJECTS } from '../indexedDb';
import { listTasks, updateTask } from './tasksRepo';

export async function listProjects() {
  return dbGetAll(STORE_PROJECTS);
}

export async function getProject(id) {
  return dbGet(STORE_PROJECTS, id);
}

export async function createProject({ name, type, canvasReference = null }) {
  const now = Date.now();
  const project = {
    id: crypto.randomUUID(),
    name,
    type,
    canvasReference,
    createdAt: now,
    updatedAt: now,
  };
  await dbPut(STORE_PROJECTS, project);
  return project;
}

// Atomic read-modify-write — see tasksRepo.js's updateTask for why.
export async function updateProject(id, patch) {
  const updated = await dbUpdate(STORE_PROJECTS, id, (existing) =>
    existing ? { ...existing, ...patch, updatedAt: Date.now() } : undefined,
  );
  return updated ?? null;
}

// Deleting a project never cascades into deleting its tasks — that would
// silently destroy a professor's work over what's just an organizational
// grouping. Affected tasks are kept, only detached (projectId: null).
export async function deleteProject(id) {
  await dbDelete(STORE_PROJECTS, id);
  const tasks = await listTasks();
  const affected = tasks.filter((t) => t.projectId === id);
  await Promise.all(affected.map((t) => updateTask(t.id, { projectId: null })));
  return affected.map((t) => t.id);
}
