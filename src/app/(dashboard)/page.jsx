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

      {/* "Sobre o CanvasTools" moved to its own dedicated page (/sobre,
          reachable from the sidebar's "Mais opções" menu) — this footer is
          the same horizontal bar layout as /login's (WebTechFooter.jsx's
          "bar" variant) minus the legal links, which only make sense on the
          entry screen. */}
      <WebTechFooter variant="bar" showLinks={false} compact />
    </main>
  );
}
