import { dbGetAll, dbGet, dbPut, dbDelete, STORE_COURSE_NOTES } from '../indexedDb';

// One record per course, keyed by the course's `course_code` (not its
// numeric Canvas id) — per product decision, so a note travels with the
// human-readable code a professor recognizes rather than an opaque id.
// `id` mirrors `courseCode` (see indexedDb.js's keyPath comment) purely so
// workspace/workspaceMerge.js's mergeRecords — built for tasks/projects —
// can reconcile these records unmodified.
export async function listCourseNotes() {
  return dbGetAll(STORE_COURSE_NOTES);
}

export async function getCourseNote(courseCode) {
  return dbGet(STORE_COURSE_NOTES, courseCode);
}

export async function saveCourseNoteLocal(courseCode, { courseId, text }) {
  const now = Date.now();
  const existing = await getCourseNote(courseCode);
  const record = {
    id: courseCode,
    courseCode,
    courseId,
    text,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await dbPut(STORE_COURSE_NOTES, record);
  return record;
}

// Replace, not merge — called only from courseNotesSync.js's merge path,
// same reasoning as tasksRepo.js's replaceAllTasks: the merge already
// happened in memory (mergeRecords), this just persists its result.
export async function replaceAllCourseNotes(notesArray) {
  const existing = await listCourseNotes();
  await Promise.all(existing.map((n) => dbDelete(STORE_COURSE_NOTES, n.id)));
  await Promise.all(
    notesArray.map((n) =>
      dbPut(STORE_COURSE_NOTES, {
        id: n.courseCode || n.id,
        courseCode: n.courseCode || n.id,
        courseId: n.courseId ?? null,
        text: n.text || '',
        createdAt: n.createdAt ?? Date.now(),
        updatedAt: n.updatedAt ?? Date.now(),
      }),
    ),
  );
  return notesArray.length;
}
