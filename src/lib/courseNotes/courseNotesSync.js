import { getGoogleConnection, getValidAccessToken, saveGoogleConnection } from '@/lib/googleConnection';
import { findDriveFile, createDriveFile, downloadDriveFile, updateDriveFile, COURSE_NOTES_FILE_NAME } from '@/lib/googleDriveClient';
import { mergeRecords } from '@/lib/recordMerge';
import { listCourseNotes, replaceAllCourseNotes } from './courseNotesRepo';

// Same bidirectional merge scheme as tasks/tasksDriveSync.js's
// mergeSyncTasks() (download, reconcile via mergeRecords — last-write-
// wins by updatedAt — write the merged result back locally, then push it to
// Drive) — reused verbatim, just scoped to one course-notes file instead of
// tasks+projects. The trigger is different by design, though: no debounced
// auto-sync scheduler here. CourseNoteEditor.jsx calls this itself, once
// when a course's note is first opened (to pull in whatever's already on
// Drive) and again only when the professor clicks "Salvar".

const EXPORT_KIND = 'course-notes-export';
const EXPORT_VERSION = 1;

async function resolveCourseNotesFileId(accessToken) {
  const cached = (await getGoogleConnection())?.courseNotesFileId;
  if (cached) return cached;
  const existing = await findDriveFile(accessToken, COURSE_NOTES_FILE_NAME);
  return existing?.id || null;
}

export async function mergeSyncCourseNotes() {
  const accessToken = await getValidAccessToken();
  const localNotes = await listCourseNotes();

  let fileId = await resolveCourseNotesFileId(accessToken);
  let remoteNotes = [];
  if (fileId) {
    // Same "never treat a failed download as an empty remote" reasoning as
    // mergeSyncTasks — a network hiccup here must abort the whole
    // attempt, not let the push step below overwrite real remote notes.
    const fileBody = await downloadDriveFile(accessToken, fileId);
    if (fileBody?.kind === EXPORT_KIND) {
      remoteNotes = Array.isArray(fileBody.notes) ? fileBody.notes : [];
    }
  }

  const merged = mergeRecords(localNotes, remoteNotes);
  await replaceAllCourseNotes(merged);

  const fileBody = {
    app: 'canvastools',
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    notes: merged,
  };
  if (fileId) {
    try {
      await updateDriveFile(accessToken, fileId, fileBody);
    } catch {
      const created = await createDriveFile(accessToken, COURSE_NOTES_FILE_NAME, fileBody);
      fileId = created.id;
    }
  } else {
    const created = await createDriveFile(accessToken, COURSE_NOTES_FILE_NAME, fileBody);
    fileId = created.id;
  }

  await saveGoogleConnection({ courseNotesFileId: fileId, courseNotesLastSuccessfulSyncAt: new Date().toISOString() });
  return merged;
}
