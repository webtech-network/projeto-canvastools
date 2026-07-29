import { getSession, isSessionValid } from '@/lib/session';
import QuestionGenerator from '@/components/QuestionGenerator';

export default async function QuestoesPage() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null; // proxy already redirects unauthenticated requests to /login
  }

  return (
    <main className="page">
      <h1>Questões</h1>
      <p className="lede">Gere questões no padrão ENADE com IA, revise e salve um arquivo pronto para importar.</p>

      <QuestionGenerator hasApiKey={Boolean(session.aiApiKeys?.openai)} />
    </main>
  );
}
