import { getSession, isSessionValid } from '@/lib/session';
import { createClient, listCourses, listConversations } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';
import { listProviders } from '@/lib/aiProviders';
import MessageBrowser from '@/components/MessageBrowser';

export default async function MensagensPage() {
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

  const rawCourses = await listCourses(client);
  const favoriteCourses = rawCourses.filter((c) => c.is_favorite);

  // A 401 here (as opposed to elsewhere in the app) almost always means the
  // Canvas Developer Key has "Enforce Scopes" on without the Conversations
  // API in its allowed list — a Canvas-admin config issue, not a bug — so
  // this is caught locally instead of crashing the whole page.
  //
  // Scoped to favorite courses only, and in a single call: Canvas's
  // `filter[]` accepts several course contexts at once and OR's them
  // together, so one Inbox call covers every favorite course.
  let conversations = [];
  let loadError = null;
  if (favoriteCourses.length > 0) {
    try {
      conversations = await listConversations(client, {
        filter: favoriteCourses.map((c) => `course_${c.id}`),
      });
    } catch {
      loadError =
        'Não foi possível carregar as mensagens. Se o problema persistir, verifique se a Developer Key do Canvas usada por este app tem o escopo de Conversas (Conversations API) habilitado.';
    }
  }

  return (
    <main className="page">
      <h1>Mensagens</h1>
      <p className="lede">
        Caixa de entrada do Canvas para seus cursos favoritos, agrupada por curso. Marque cursos como favoritos no
        Painel de Cursos para vê-los aqui.
      </p>

      {loadError && (
        <p className="alert alert-error" role="alert">
          {loadError}
        </p>
      )}

      {favoriteCourses.length === 0 ? (
        <p className="lede">Você ainda não marcou nenhum curso como favorito/em destaque no Canvas.</p>
      ) : (
        <MessageBrowser
          courses={favoriteCourses}
          conversations={conversations}
          currentUserId={session.user?.id}
          baseUrl={session.baseUrl}
          providers={configuredProviders}
        />
      )}
    </main>
  );
}
