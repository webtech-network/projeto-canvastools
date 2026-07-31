import { getSession, isSessionValid } from '@/lib/session';
import { createClient, getCourse, listCourseStudents } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';
import { buildStudentRows } from '@/lib/studentReport';
import StudentReport from '@/components/StudentReport';
import ContextBanner from '@/components/ContextBanner';

export default async function AlunosPage({ params }) {
  const { courseId } = await params;
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
  // (already fixed once, on the quiz-import page, the same way).
  const course = await getCourse(client, courseId);
  const students = await listCourseStudents(client, courseId, { include: ['enrollments', 'email'] });

  const rows = buildStudentRows(students);

  return (
    <main className="page">
      <h1>Alunos</h1>
      <ContextBanner items={[{ label: 'Curso', value: course.name }]} />
      <p className="lede">Listagem dos alunos ativos do curso, com dados de matrícula, atividade e notas.</p>

      <StudentReport rows={rows} />
    </main>
  );
}
