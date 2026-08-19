import Link from 'next/link';
import { getSession, isSessionValid } from '@/lib/session';
import { createClient, getCourse, listAssignments } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';
import { isRealGroupAssignment, correctedGroupNeedsGradingCount } from '@/lib/groupGrading';
import { courseUrl } from '@/lib/canvasLinks';
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
  const rawAssignments = await listAssignments(client, courseId);

  // Same sequencing reasoning as above applies to each of these extra calls
  // too — a for loop, not Promise.all. Best-effort: if a particular
  // assignment's submissions can't be fetched (e.g. a permissions quirk),
  // fall back to Canvas's own (overcounted) needs_grading_count rather than
  // failing the whole page.
  const assignments = [];
  for (const assignment of rawAssignments) {
    if (!isRealGroupAssignment(assignment) || !assignment.needs_grading_count) {
      assignments.push(assignment);
      continue;
    }
    try {
      const needs_grading_count = await correctedGroupNeedsGradingCount(client, courseId, assignment);
      assignments.push({ ...assignment, needs_grading_count });
    } catch {
      assignments.push(assignment);
    }
  }

  return (
    <main className="page">
      <div className="page-header-row">
        <div>
          <h1>Atividades</h1>
          <ContextBanner
            items={[
              {
                label: 'Curso',
                value: course.name,
                link: { href: courseUrl(session.baseUrl, courseId), title: 'Abrir curso no Canvas' },
              },
            ]}
          />
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
