// "Agrupar por projeto" (WorkspaceView.jsx's toolbar toggle, WorkspaceProvider's
// groupByProject) — shared by KanbanColumn.jsx, EisenhowerQuadrant.jsx and
// TaskTable.jsx so all three views cluster the same way when it's on. Pure
// re-bucketing: it preserves whatever order `tasks` is already in within each
// group (callers sort first), it just clusters. Groups are ordered
// alphabetically by project name; tasks with no project (or a projectId that
// no longer resolves, e.g. a since-deleted project) land in one `project:
// null` ("Sem projeto") group, always last.
export function groupTasksByProject(tasks, projects) {
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const buckets = new Map();
  for (const task of tasks) {
    const key = task.projectId && projectsById.has(task.projectId) ? task.projectId : null;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(task);
  }
  const groups = [...buckets.entries()]
    .filter(([key]) => key !== null)
    .map(([key, groupTasks]) => ({ project: projectsById.get(key), tasks: groupTasks }))
    .sort((a, b) => a.project.name.localeCompare(b.project.name));
  if (buckets.has(null)) {
    groups.push({ project: null, tasks: buckets.get(null) });
  }
  return groups;
}
