import { getSession, isSessionValid } from '@/lib/session';
import { createClient, getCourse, getQuiz } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';
import { listProviders } from '@/lib/aiProviders';
import QuizImportPanel from '@/components/QuizImportPanel';
import ContextBanner from '@/components/ContextBanner';

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

  // Sequential, not Promise.all: firing both requests concurrently on a stale
  // access token means both 401 at once and each independently races to
  // refresh via onUnauthorized — two simultaneous refresh-token exchanges
  // against Canvas, which isn't safe (observed causing a hard failure here).
  const course = await getCourse(client, courseId);
  const quiz = await getQuiz(client, courseId, quizId);
  const configuredProviders = listProviders().filter((provider) => Boolean(session.aiApiKeys?.[provider.id]));

  return (
    <main className="page">
      <h1>Importar questões</h1>
      <ContextBanner
        items={[
          { label: 'Curso', value: course.name },
          { label: 'Atividade', value: quiz.title },
        ]}
      />
      <QuizImportPanel courseId={courseId} quizId={quizId} providers={configuredProviders} />
    </main>
  );
}
