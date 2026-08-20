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

// Replace, not merge — see tasksRepo.js's replaceAllTasks. Called only from
// workspace/workspaceDriveSync.js's pull path.
export async function replaceAllProjects(projectsArray) {
  const existing = await listProjects();
  await Promise.all(existing.map((p) => dbDelete(STORE_PROJECTS, p.id)));
  const now = Date.now();
  await Promise.all(
    projectsArray.map((p) =>
      dbPut(STORE_PROJECTS, {
        id: typeof p.id === 'string' && p.id ? p.id : crypto.randomUUID(),
        name: p.name || '',
        type: p.type === 'canvas-course' ? 'canvas-course' : 'personal',
        canvasReference: p.canvasReference ?? null,
        createdAt: p.createdAt ?? now,
        updatedAt: p.updatedAt ?? now,
      }),
    ),
  );
  return projectsArray.length;
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
