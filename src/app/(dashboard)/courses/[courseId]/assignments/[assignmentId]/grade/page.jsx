import { getSession, isSessionValid } from '@/lib/session';
import { createClient, getCourse, getAssignment, listSubmissions } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';
import ContextBanner from '@/components/ContextBanner';
import RubricGrader from '@/components/RubricGrader';

export default async function GradeAssignmentPage({ params }) {
  const { courseId, assignmentId } = await params;
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null;
  }

  const client = createClient({
    baseUrl: session.baseUrl,
    token: session.accessToken,
    onUnauthorized: async () => {
      const refreshed = await refreshAccessToken(session.refreshToken);
      return refreshed.access_token;
    },
  });

  // Sequenced, not Promise.all — this app has a known bug where firing
  // multiple Canvas calls concurrently on a near-expired access token causes
  // simultaneous 401s and a concurrent-refresh race that crashes the page
  // (already fixed the same way on the quiz-import and atividades pages).
  const course = await getCourse(client, courseId);
  const assignment = await getAssignment(client, courseId, assignmentId);

  // Grading no longer requires a rubric — RubricGrader falls back to a
  // plain "Nota" column (see its own comment) when assignment.rubric is
  // absent, so submissions are always fetched, not just when there's one.
  const submissions = await listSubmissions(client, courseId, assignmentId, {
    include: ['user', 'rubric_assessment', 'group'],
  });

  // Canvas returns one submission per *student* either way — for a group
  // assignment it also returns each submission's `group` (requested above),
  // but only rows up when the course isn't set to grade group members
  // individually does that submission actually represent the whole group
  // (same grade for everyone in it, propagated automatically by Canvas when
  // you grade any one member — see the PUT route this page's RubricGrader
  // posts to). When grade_group_students_individually is true, each student
  // still gets graded on their own despite belonging to a group, so the
  // table should show students, not groups.
  const isGroupAssignment = Boolean(assignment.group_category_id) && !assignment.grade_group_students_individually;

  const speedGraderUrl = `${session.baseUrl}/courses/${courseId}/gradebook/speed_grader?assignment_id=${assignmentId}`;

  return (
    <main className="page">
      <h1>Correção de Atividade</h1>
      <ContextBanner
        items={[
          { label: 'Curso', value: course.name },
          {
            label: 'Atividade',
            value: assignment.name,
            link: { href: speedGraderUrl, title: 'Abrir no SpeedGrader do Canvas' },
          },
        ]}
      />

      <RubricGrader
        courseId={courseId}
        assignmentId={assignmentId}
        rubric={assignment.rubric}
        pointsPossible={assignment.points_possible}
        submissions={submissions}
        groupAssignment={isGroupAssignment}
      />
    </main>
  );
}
