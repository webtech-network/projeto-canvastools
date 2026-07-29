import { getSession, isSessionValid } from '@/lib/session';
import { createClient, listCourses } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';
import CourseBrowser from '@/components/CourseBrowser';

export default async function CoursesPage() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null; // middleware already redirects unauthenticated requests to /login
  }

  const client = createClient({
    baseUrl: session.baseUrl,
    token: session.accessToken,
    onUnauthorized: async () => {
      const refreshed = await refreshAccessToken(session.refreshToken);
      return refreshed.access_token;
    },
  });

  const rawCourses = await listCourses(client);
  // Canvas's course-list endpoint doesn't return an html_url by default (unlike
  // assignments, which do) — build the link to the course's own Canvas page ourselves.
  const courses = rawCourses.map((course) => ({
    ...course,
    html_url: `${session.baseUrl}/courses/${course.id}`,
  }));

  return (
    <main className="page">
      <h1>Painel de Cursos</h1>
      <p className="lede">Cursos ativos em que você está matriculado como professor.</p>

      {courses.length === 0 ? <p>Nenhum curso encontrado para esta conta.</p> : <CourseBrowser courses={courses} />}
    </main>
  );
}
