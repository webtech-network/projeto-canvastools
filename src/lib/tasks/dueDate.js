// Shared by TaskCard.jsx and TaskTable.jsx — dueDate is stored as a plain
// 'YYYY-MM-DD' string (no time/timezone), same shape a <input type="date">
// produces. Parsing it via `new Date('YYYY-MM-DD')` treats it as UTC
// midnight per the ISO 8601 spec, which then displays as the *previous* day
// in any timezone behind UTC (e.g. Brazil) once formatted in local time.
// Building the Date from its numeric parts instead uses the local-time
// constructor, so the displayed day always matches what was picked in the
// date input.
export function formatDueDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// A finished task is never "late" regardless of its due date, so DONE is
// excluded — same reasoning as EisenhowerMatrix.jsx's MATRIX_ALWAYS_EXCLUDED.
export function isPastDue(dateStr, status) {
  if (!dateStr || status === 'DONE') return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}
