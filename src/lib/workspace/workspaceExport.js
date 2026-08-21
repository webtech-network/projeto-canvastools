import { listTasks, replaceAllTasks } from './tasksRepo';
import { listProjects, replaceAllProjects } from './projectsRepo';
import { mergeRecords } from './workspaceMerge';

// Same envelope shape as the Google Drive workspace sync file
// (workspaceDriveSync.js imports these same constants) — a file exported
// here is, in principle, interchangeable with the Drive file, just reached
// via a manual download/upload instead of the automatic sync.
export const WORKSPACE_EXPORT_KIND = 'workspace-export';
export const WORKSPACE_EXPORT_VERSION = 1;

function buildWorkspaceExportPayload(tasks, projects) {
  return {
    app: 'canvastools',
    kind: WORKSPACE_EXPORT_KIND,
    version: WORKSPACE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tasks,
    projects,
  };
}

// Downloads every local task + project (including tombstones — same
// reasoning as the Drive file: a re-import elsewhere must not resurrect
// something deleted here) as a JSON file. Purely local: doesn't touch
// Google Drive or the sync scheduler.
export async function exportWorkspaceFile() {
  const [tasks, projects] = await Promise.all([listTasks(), listProjects()]);
  const payload = buildWorkspaceExportPayload(tasks, projects);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `canvastools-tarefas-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return {
    tasks: tasks.filter((t) => !t.deletedAt).length,
    projects: projects.filter((p) => !p.deletedAt).length,
  };
}

// Merges an imported file's tasks/projects into what's already local — same
// last-write-wins-by-updatedAt reconciliation the Google Drive sync uses
// (mergeRecords, workspaceMerge.js) rather than a destructive replace, so
// importing an older export (or importing on a second device with its own
// unsynced edits) never silently loses newer local changes.
export async function importWorkspaceFile(file) {
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Arquivo inválido: não é um JSON válido.');
  }
  if (parsed.kind !== WORKSPACE_EXPORT_KIND || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects)) {
    throw new Error('Arquivo inválido: não é um export de tarefas do CanvasTools.');
  }

  const [localTasks, localProjects] = await Promise.all([listTasks(), listProjects()]);
  const mergedTasks = mergeRecords(localTasks, parsed.tasks);
  const mergedProjects = mergeRecords(localProjects, parsed.projects);
  await replaceAllTasks(mergedTasks);
  await replaceAllProjects(mergedProjects);

  return {
    tasks: mergedTasks.filter((t) => !t.deletedAt).length,
    projects: mergedProjects.filter((p) => !p.deletedAt).length,
  };
}
