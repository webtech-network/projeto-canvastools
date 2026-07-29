import { getSession, isSessionValid } from '@/lib/session';
import { createClient, getQuiz } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';
import ImportQuestions from '@/components/ImportQuestions';

export default async function ImportPage({ params }) {
  const { courseId, quizId } = await params;
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

  const quiz = await getQuiz(client, courseId, quizId);

  return (
    <main className="page">
      <h1>Importar questões</h1>
      <p className="lede">
        Destino: <strong>{quiz.title}</strong>
      </p>
      <ImportQuestions courseId={courseId} quizId={quizId} />
    </main>
  );
}
