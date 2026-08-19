// Pure filtering shared by KanbanBoard.jsx and EisenhowerMatrix.jsx — one
// filtered array, each view groups it differently downstream (by status vs.
// by quadrant). `projects` is passed in so a course-scoped filter can match
// tasks via their project's canvasReference, not just the task's own
// (optional) canvasReferences.courseId.

export const EMPTY_FILTERS = {
  projectId: null,
  courseId: null,
  tag: null,
  status: null,
  urgent: null,
  important: null,
  dueBefore: null,
};

function taskCourseId(task, projectsById) {
  if (task.canvasReferences?.courseId) return String(task.canvasReferences.courseId);
  const project = task.projectId ? projectsById.get(task.projectId) : null;
  return project?.canvasReference?.courseId ? String(project.canvasReference.courseId) : null;
}

export function applyFilters(tasks, filters, projects = []) {
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const dueBeforeTime = filters.dueBefore ? new Date(filters.dueBefore).getTime() : null;

  return tasks.filter((task) => {
    if (filters.projectId && task.projectId !== filters.projectId) return false;
    if (filters.courseId && taskCourseId(task, projectsById) !== String(filters.courseId)) return false;
    if (filters.tag && !(task.tags || []).includes(filters.tag)) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.urgent !== null && filters.urgent !== undefined && Boolean(task.priority?.urgent) !== filters.urgent) {
      return false;
    }
    if (
      filters.important !== null &&
      filters.important !== undefined &&
      Boolean(task.priority?.important) !== filters.important
    ) {
      return false;
    }
    if (dueBeforeTime !== null) {
      if (!task.dueDate) return false;
      if (new Date(task.dueDate).getTime() > dueBeforeTime) return false;
    }
    return true;
  });
}
