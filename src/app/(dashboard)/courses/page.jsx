import { getSession, isSessionValid } from '@/lib/session';
import CourseBrowser from '@/components/CourseBrowser';

// No Canvas data is fetched here anymore — CourseBrowser fetches it
// client-side (via /api/canvas/courses) with an IndexedDB stale-while-
// revalidate cache, so navigating to /courses paints instantly instead of
// blocking on a Canvas round-trip inside this Server Component render.
export default async function CoursesPage() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null; // middleware already redirects unauthenticated requests to /login
  }

  return (
    <main className="page">
      <h1>Painel de Cursos</h1>
      <p className="lede">Cursos ativos em que você está matriculado como professor.</p>

      <CourseBrowser />
    </main>
  );
}
