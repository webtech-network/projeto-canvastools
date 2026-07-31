import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { listCourses, listConversations } from '@/lib/canvasClient';
import { buildClient } from '@/lib/canvasSession';
import { countMessagesByCourse } from '@/lib/messageGrouping';

// Backs CourseBrowser.jsx's client-side stale-while-revalidate fetch — moved
// out of courses/page.jsx (a Server Component) so navigating to /courses no
// longer blocks on this Canvas round-trip before the page can render; the
// client paints instantly from IndexedDB cache instead, then calls this to
// refresh in the background.
export async function GET() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const client = buildClient(session);

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

  return NextResponse.json({ courses });
}
