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

  let submissions = [];
  if (assignment.rubric) {
    submissions = await listSubmissions(client, courseId, assignmentId, { include: ['user', 'rubric_assessment'] });
  }

  return (
    <main className="page">
      <h1>Corrigir com rubrica</h1>
      <ContextBanner
        items={[
          { label: 'Curso', value: course.name },
          { label: 'Atividade', value: assignment.name },
        ]}
      />

      {!assignment.rubric ? (
        <p className="alert alert-warning" role="alert">
          Esta atividade não possui rubrica associada no Canvas. Associe uma rubrica à atividade primeiro para poder
          corrigir por aqui.
        </p>
      ) : (
        <RubricGrader courseId={courseId} assignmentId={assignmentId} rubric={assignment.rubric} submissions={submissions} />
      )}
    </main>
  );
}
