import { getSession, isSessionValid } from '@/lib/session';
import { listProviders } from '@/lib/aiProviders';
import MessageBrowser from '@/components/MessageBrowser';

// No Canvas data is fetched here anymore — MessageBrowser fetches it
// client-side (via /api/canvas/messages) with an IndexedDB stale-while-
// revalidate cache, so navigating to /mensagens paints instantly instead of
// blocking on a Canvas round-trip inside this Server Component render.
export default async function MensagensPage() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null;
  }

  const configuredProviders = listProviders().filter((provider) => Boolean(session.aiApiKeys?.[provider.id]));

  return (
    <main className="page">
      <h1>Mensagens</h1>
      <p className="lede">
        Caixa de entrada do Canvas para seus cursos favoritos e publicados, agrupada por curso. Marque cursos como
        favoritos no Painel de Cursos para vê-los aqui.
      </p>

      <MessageBrowser currentUserId={session.user?.id} baseUrl={session.baseUrl} providers={configuredProviders} />
    </main>
  );
}
