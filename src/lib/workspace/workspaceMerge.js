// Deliberately simple: whole-record last-write-wins by updatedAt, not a
// field-level CRDT merge — if the same task is edited differently on two
// offline devices before either syncs, the later save fully wins and the
// earlier device's specific changes are lost (not merged field-by-field).
// Acceptable for a personal task list; documented here rather than hidden.
//
// Deletion is a soft delete (deletedAt stamped, see tasksRepo.js/
// projectsRepo.js) so it can participate in the same updatedAt comparison
// as any other change — a delete only "wins" if it's the newest change,
// exactly like an edit would. Tombstones are never purged: at realistic
// personal-task-list scale (tens to low hundreds of records) the storage
// cost of keeping them forever is negligible, and purging them would
// reintroduce the exact bug they solve — a device offline longer than the
// retention window would see its still-active local copy of a
// purged-tombstone task as "local-only, keep it" and silently resurrect it.
export function mergeRecords(localList, remoteList) {
  const byId = new Map();
  for (const record of localList) byId.set(record.id, record);
  for (const record of remoteList) {
    const existing = byId.get(record.id);
    if (!existing || (record.updatedAt || 0) > (existing.updatedAt || 0)) {
      byId.set(record.id, record);
    }
  }
  return [...byId.values()];
}
