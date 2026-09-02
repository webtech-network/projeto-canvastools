import { readCache, writeCache } from '../dashboardCache';

// Resolves a Task/Project's Canvas id references (courseId/assignmentId/
// studentId) into display names, without ever storing that data in the
// tasks module's own IndexedDB records (see CLAUDE.md — Canvas stays the
// source of truth). Stale-while-revalidate through the same `cache` store
// dashboardCache.js already backs CourseBrowser.jsx with.

const COURSE_LIST_CACHE_KEY = 'courses:list';
const STALE_AFTER_MS = 5 * 60 * 1000;

function isStale(fetchedAt) {
  return !fetchedAt || Date.now() - fetchedAt > STALE_AFTER_MS;
}

export async function resolveCourseName(courseId) {
  if (!courseId) return null;
  const cached = await readCache(COURSE_LIST_CACHE_KEY);
  const fromCache = cached?.data?.find((c) => String(c.id) === String(courseId));
  if (fromCache && !isStale(cached.fetchedAt)) return fromCache.name;

  try {
    const response = await fetch('/api/canvas/courses');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    await writeCache(COURSE_LIST_CACHE_KEY, data.courses);
    return data.courses.find((c) => String(c.id) === String(courseId))?.name || fromCache?.name || null;
  } catch {
    return fromCache?.name || null;
  }
}

export async function resolveAssignmentName(courseId, assignmentId) {
  if (!courseId || !assignmentId) return null;
  const cacheKey = `tasks:assignments:${courseId}`;
  const cached = await readCache(cacheKey);
  let assignments = cached?.data;

  if (!assignments || isStale(cached?.fetchedAt)) {
    try {
      const response = await fetch(`/api/canvas/courses/${courseId}/assignments`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      assignments = data.assignments;
      await writeCache(cacheKey, assignments);
    } catch {
      // fall through to whatever was cached, even if stale
    }
  }

  return assignments?.find((a) => String(a.id) === String(assignmentId))?.name || null;
}

export async function resolveStudentName(courseId, studentId) {
  if (!courseId || !studentId) return null;
  const cacheKey = `tasks:students:${courseId}`;
  const cached = await readCache(cacheKey);
  let students = cached?.data;

  if (!students || isStale(cached?.fetchedAt)) {
    try {
      const response = await fetch(`/api/canvas/courses/${courseId}/students`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      students = data.students;
      await writeCache(cacheKey, students);
    } catch {
      // fall through to whatever was cached, even if stale
    }
  }

  return students?.find((s) => String(s.id) === String(studentId))?.name || null;
}

export async function listCourseAssignments(courseId) {
  if (!courseId) return [];
  const cacheKey = `tasks:assignments:${courseId}`;
  const cached = await readCache(cacheKey);
  if (cached && !isStale(cached.fetchedAt)) return cached.data;

  try {
    const response = await fetch(`/api/canvas/courses/${courseId}/assignments`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    await writeCache(cacheKey, data.assignments);
    return data.assignments;
  } catch {
    return cached?.data || [];
  }
}

export async function listCourseStudentsCached(courseId) {
  if (!courseId) return [];
  const cacheKey = `tasks:students:${courseId}`;
  const cached = await readCache(cacheKey);
  if (cached && !isStale(cached.fetchedAt)) return cached.data;

  try {
    const response = await fetch(`/api/canvas/courses/${courseId}/students`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    await writeCache(cacheKey, data.students);
    return data.students;
  } catch {
    return cached?.data || [];
  }
}

export async function listCoursesCached() {
  const cached = await readCache(COURSE_LIST_CACHE_KEY);
  if (cached && !isStale(cached.fetchedAt)) return cached.data;

  try {
    const response = await fetch('/api/canvas/courses');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    await writeCache(COURSE_LIST_CACHE_KEY, data.courses);
    return data.courses;
  } catch {
    return cached?.data || [];
  }
}
