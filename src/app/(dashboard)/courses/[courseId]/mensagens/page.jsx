import { getSession, isSessionValid } from '@/lib/session';
import { createClient, getCourse, listConversations } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';
import { listProviders } from '@/lib/aiProviders';
import ComposeMessage from '@/components/ComposeMessage';
import MessageList from '@/components/MessageList';
import ContextBanner from '@/components/ContextBanner';

export default async function CourseMensagensPage({ params }) {
  const { courseId } = await params;
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null;
  }

  const configuredProviders = listProviders().filter((provider) => Boolean(session.aiApiKeys?.[provider.id]));

  const client = createClient({
    baseUrl: session.baseUrl,
    token: session.accessToken,
    onUnauthorized: async () => {
      const refreshed = await refreshAccessToken(session.refreshToken);
      return refreshed.access_token;
    },
  });

  const course = await getCourse(client, courseId);

  // A 401 here (as opposed to elsewhere in the app) almost always means the
  // Canvas Developer Key has "Enforce Scopes" on without the Conversations
  // API in its allowed list — a Canvas-admin config issue, not a bug — so
  // this is caught locally instead of crashing the whole page.
  let conversations = [];
  let loadError = null;
  try {
    conversations = await listConversations(client, { filter: [`course_${courseId}`] });
  } catch {
    loadError =
      'Não foi possível carregar as mensagens deste curso. Se o problema persistir, verifique se a Developer Key do Canvas usada por este app tem o escopo de Conversas (Conversations API) habilitado.';
  }

  return (
    <main className="page">
      <h1>Mensagens</h1>
      <ContextBanner items={[{ label: 'Curso', value: course.name }]} />
      <p className="lede">Mensagens da caixa de entrada do Canvas associadas a este curso.</p>

      <ComposeMessage courseId={courseId} providers={configuredProviders} />

      {loadError ? (
        <p className="alert alert-error" role="alert">
          {loadError}
        </p>
      ) : (
        <MessageList
          conversations={conversations}
          currentUserId={session.user?.id}
          baseUrl={session.baseUrl}
          providers={configuredProviders}
        />
      )}
    </main>
  );
}
