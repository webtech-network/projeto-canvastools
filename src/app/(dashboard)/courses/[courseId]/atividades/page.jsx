import Link from 'next/link';
import { ClipboardCheck, FileQuestion } from 'lucide-react';
import { getSession, isSessionValid } from '@/lib/session';
import { createClient, getCourse, listAssignments } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';
import StatusIcon from '@/components/StatusIcon';

function formatDueDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

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

  const [course, assignments] = await Promise.all([getCourse(client, courseId), listAssignments(client, courseId)]);

  return (
    <main className="page">
      <div className="page-header-row">
        <div>
          <h1>Atividades — {course.name}</h1>
          <p className="lede">
            Avaliações pendentes de correção por atividade. Quizzes clássicos podem receber questões importadas.
          </p>
        </div>
        <Link href="/questoes" className="btn btn-secondary">
          Gerar questões com IA
        </Link>
      </div>

      {assignments.length === 0 ? (
        <p>Nenhuma atividade encontrada neste curso.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <span className="sr-only">Status</span>
              </th>
              <th>Atividade</th>
              <th>Data de entrega</th>
              <th title="Correções pendentes">
                <ClipboardCheck size={16} strokeWidth={1.8} className="col-icon" aria-hidden="true" />
                <span className="sr-only">Correções pendentes</span>
              </th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.id}>
                <td className="status-cell">
                  <StatusIcon status={assignment.published ? 'published' : 'unpublished'} />
                </td>
                <td className="course-name-cell">
                  <a
                    href={assignment.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir atividade no Canvas"
                  >
                    {assignment.name}
                  </a>
                </td>
                <td className="pending-cell">{formatDueDate(assignment.due_at)}</td>
                <td className="pending-cell">
                  <span className={`pending-badge${assignment.needs_grading_count ? ' has-pending' : ''}`}>
                    {assignment.needs_grading_count ?? 0}
                  </span>
                </td>
                <td className="actions-cell">
                  {/* Only classic quizzes (assignment.quiz_id) can receive imported
                      questions — New Quizzes (is_quiz_assignment) and regular
                      assignments intentionally get no action here. */}
                  {assignment.quiz_id && (
                    <Link
                      href={`/courses/${courseId}/quizzes/${assignment.quiz_id}/import`}
                      className="btn btn-primary btn-icon"
                      title="Importar questões"
                      aria-label="Importar questões"
                    >
                      <FileQuestion size={18} strokeWidth={1.8} />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
