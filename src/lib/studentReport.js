export const ENROLLMENT_STATE_LABELS = {
  active: 'Ativa',
  invited: 'Convidada',
  rejected: 'Rejeitada',
  completed: 'Concluída',
  inactive: 'Inativa',
};

// A user can carry more than one enrollment in the same course (rare, but
// possible with multiple sections) — the StudentEnrollment one is what the
// report cares about; any other type present is ignored.
function primaryEnrollment(student) {
  const enrollments = student.enrollments || [];
  return enrollments.find((e) => e.type === 'StudentEnrollment') || enrollments[0] || null;
}

/**
 * Flattens Canvas's nested user+enrollment shape into one row per student for
 * the report table. `sections` is the array from listCourseSections, used to
 * resolve an enrollment's course_section_id into a name.
 */
export function buildStudentRows(students, sections = []) {
  const sectionNameById = Object.fromEntries(sections.map((s) => [s.id, s.name]));

  return students.map((student) => {
    const enrollment = primaryEnrollment(student);
    const email = student.email || null;
    return {
      id: student.id,
      name: student.name,
      sortableName: student.sortable_name || student.name,
      contact: email || student.login_id || '—',
      contactIsLogin: !email && Boolean(student.login_id),
      section: enrollment?.course_section_id ? sectionNameById[enrollment.course_section_id] || '—' : '—',
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
