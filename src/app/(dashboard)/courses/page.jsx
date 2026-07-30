import { getSession, isSessionValid } from '@/lib/session';
import { createClient, listCourses, listConversations } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';
import { countMessagesByCourse } from '@/lib/messageGrouping';
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
  const favoriteIds = rawCourses.filter((c) => c.is_favorite).map((c) => c.id);

  // Canvas has no per-course message count on the course-list endpoint (unlike
  // needs_grading_count), and message counts are only tracked for favorite
  // courses to keep this to a single extra call: Canvas's `filter[]` accepts
  // several course contexts at once and OR's them together, so one Inbox call
  // covers every favorite course instead of one call per course.
  let messageCounts = new Map();
  if (favoriteIds.length > 0) {
    try {
      const conversations = await listConversations(client, {
        filter: favoriteIds.map((id) => `course_${id}`),
      });
      messageCounts = countMessagesByCourse(conversations, favoriteIds);
    } catch {
      messageCounts = null; // signals "failed to load", distinct from "not a favorite" below
    }
  }

  // Canvas's course-list endpoint doesn't return an html_url by default (unlike
  // assignments, which do) — build the link to the course's own Canvas page ourselves.
  const courses = rawCourses.map((course) => ({
    ...course,
    html_url: `${session.baseUrl}/courses/${course.id}`,
    message_count: course.is_favorite ? (messageCounts ? messageCounts.get(String(course.id)) : null) : undefined,
  }));

  return (
    <main className="page courses-page">
      <h1>Painel de Cursos</h1>
      <p className="lede">Cursos ativos em que você está matriculado como professor.</p>

      {courses.length === 0 ? <p>Nenhum curso encontrado para esta conta.</p> : <CourseBrowser courses={courses} />}
    </main>
  );
}
