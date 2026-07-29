import { getSession, isSessionValid } from '@/lib/session';
import { listProviders } from '@/lib/aiProviders';
import QuestionGenerator from '@/components/QuestionGenerator';

export default async function QuestoesPage() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null; // proxy already redirects unauthenticated requests to /login
  }

  const configuredProviders = listProviders().filter((provider) => Boolean(session.aiApiKeys?.[provider.id]));

  return (
    <main className="page">
      <h1>Questões</h1>
      <p className="lede">Gere questões no padrão ENADE com IA, revise e salve um arquivo pronto para importar.</p>

      <QuestionGenerator providers={configuredProviders} />
    </main>
  );
}
