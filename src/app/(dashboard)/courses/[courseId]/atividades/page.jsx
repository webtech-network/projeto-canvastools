import Link from 'next/link';
import { getSession, isSessionValid } from '@/lib/session';
import { createClient, getCourse, listAssignments } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';
import ContextBanner from '@/components/ContextBanner';
import AssignmentsTable from '@/components/AssignmentsTable';

export default async function AtividadesPage({ params }) {
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

  // Sequenced, not Promise.all — firing both requests concurrently on a
  // near-expired access token means both 401 at once and each independently
  // races to refresh via onUnauthorized, causing a hard crash (observed live
  // on this page; already fixed the same way on the quiz-import page).
  const course = await getCourse(client, courseId);
  const assignments = await listAssignments(client, courseId);

  return (
    <main className="page">
      <div className="page-header-row">
        <div>
          <h1>Atividades</h1>
          <ContextBanner items={[{ label: 'Curso', value: course.name }]} />
          <p className="lede">
            Avaliações pendentes de correção por atividade. Quizzes clássicos podem receber questões importadas.
          </p>
        </div>
        <Link href="/questoes" className="btn btn-secondary">
          Gerar questões com IA
        </Link>
      </div>

      <AssignmentsTable courseId={courseId} assignments={assignments} />
    </main>
  );
}
