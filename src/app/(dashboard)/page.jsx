import { getSession, isSessionValid } from '@/lib/session';
import DashboardPanel from '@/components/DashboardPanel';
import WebTechFooter from '@/components/WebTechFooter';

export default async function HomePage() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null; // proxy already redirects unauthenticated requests to /login
  }

  return (
    <main className="page">
      <h1>Olá, {session.user?.name?.split(' ')[0] || 'professor(a)'}</h1>
      <p className="lede">Um resumo dos seus cursos favoritos, mensagens e prazos.</p>

      <DashboardPanel />

      <details className="cover-details">
        <summary>Sobre o CanvasTools</summary>
        <p className="lede">
          O CanvasTools é uma aplicação criada pelo{' '}
          <a href="https://webtech.network/" target="_blank" rel="noopener noreferrer">
            WebTech Network
          </a>
          , projeto de extensão da PUC Minas, para auxiliar alunos e professores na organização das atividades de
          ensino e aprendizagem, gerando maior agilidade aos processos. Em um único painel, são encontradas
          informações relevantes sobre as unidades curriculares para facilitar o acompanhamento da rotina
          acadêmica. Tudo integrado ao ambiente do Canvas e com apoio de IA, usando a própria chave de API de cada
          usuário, cadastrada individualmente no perfil.
        </p>
      </details>

      <WebTechFooter />
    </main>
  );
}
