export const ENROLLMENT_STATE_LABELS = {
  active: 'Ativa',
  invited: 'Convidada',
  rejected: 'Rejeitada',
  completed: 'Concluída',
  inactive: 'Inativa',
};

// A user can carry more than one enrollment in the same course (rare, but
// possible with multiple sections, or a re-enrollment after being removed
// and re-added) — the StudentEnrollment one(s) are what the report cares
// about; any other type present is ignored. When more than one
// StudentEnrollment exists, the "best" one wins by this priority order
// (active > invited > completed > inactive) rather than whichever Canvas
// happens to list first — otherwise a student who's genuinely active in one
// section could get masked by a stale/removed enrollment in another,
// showing the wrong status for no reason a professor could see in Canvas's
// own UI (which always surfaces the most relevant enrollment per student).
const ENROLLMENT_STATE_PRIORITY = ['active', 'invited', 'completed', 'inactive'];

function primaryEnrollment(student) {
  const enrollments = student.enrollments || [];
  const studentEnrollments = enrollments.filter((e) => e.type === 'StudentEnrollment');
  if (studentEnrollments.length <= 1) return studentEnrollments[0] || enrollments[0] || null;

  return studentEnrollments.reduce((best, e) => {
    const bestRank = ENROLLMENT_STATE_PRIORITY.indexOf(best.enrollment_state);
    const rank = ENROLLMENT_STATE_PRIORITY.indexOf(e.enrollment_state);
    return rank !== -1 && (bestRank === -1 || rank < bestRank) ? e : best;
  });
}

/**
 * Flattens Canvas's nested user+enrollment shape into one row per student for
 * the report table.
 */
export function buildStudentRows(students) {
  return students.map((student) => {
    const enrollment = primaryEnrollment(student);
    const email = student.email || null;
    return {
      id: student.id,
      name: student.name,
      sortableName: student.sortable_name || student.name,
      contact: email || student.login_id || '—',
      contactIsLogin: !email && Boolean(student.login_id),
      enrollmentState: enrollment?.enrollment_state || null,
      lastActivityAt: enrollment?.last_activity_at || null,
      totalActivityTime: enrollment?.total_activity_time ?? null,
      currentScore: enrollment?.grades?.current_score ?? null,
      currentGrade: enrollment?.grades?.current_grade ?? null,
      finalScore: enrollment?.grades?.final_score ?? null,
      finalGrade: enrollment?.grades?.final_grade ?? null,
    };
  });
}
