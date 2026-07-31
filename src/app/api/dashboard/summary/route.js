import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { buildClient } from '@/lib/canvasSession';
import { listCourses, listAssignments, listConversations } from '@/lib/canvasClient';
import {
  filterActiveFavoriteCourses,
  sumTotalStudents,
  derivePendingGrading,
  deriveDueDateItems,
  deriveRecentWindow,
} from '@/lib/dashboard';

function serializeItem(item) {
  return { ...item, dueAt: item.dueAt.toISOString() };
}

// Backs the dashboard's stale-while-revalidate panel (see DashboardPanel.jsx)
// — everything here is scoped to favorited + published courses, following
// the same call-minimization convention as courses/page.jsx and
// mensagens/page.jsx. Each Canvas sub-fetch is independently allowed to
// fail (Promise.allSettled) so one flaky call doesn't blank the whole panel.
export async function GET() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const client = buildClient(session);

  let rawCourses;
  try {
    rawCourses = await listCourses(client);
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar cursos do Canvas.' }, { status: 502 });
  }

  const courses = filterActiveFavoriteCourses(rawCourses);
  const errors = [];

  const [messagesResult, assignmentsResult] = await Promise.allSettled([
    courses.length
      ? listConversations(client, { filter: courses.map((c) => `course_${c.id}`), scope: 'unread' })
      : Promise.resolve([]),
    courses.length
      ? Promise.all(courses.map((c) => listAssignments(client, c.id))).then((lists) => lists.flat())
      : Promise.resolve([]),
  ]);

  const pendingCount = messagesResult.status === 'fulfilled' ? messagesResult.value.length : null;
  if (messagesResult.status === 'rejected') errors.push('messages');

  const assignments = assignmentsResult.status === 'fulfilled' ? assignmentsResult.value : [];
  if (assignmentsResult.status === 'rejected') errors.push('assignments');

  const { pendingAssignmentsCount, pendingGradingSum } = derivePendingGrading(assignments);
  const dueDateItems = deriveDueDateItems(assignments, courses);
  const recentItems = deriveRecentWindow(dueDateItems);

  return NextResponse.json({
    courses: { total: courses.length, items: courses.map((c) => ({ id: c.id, name: c.name })) },
    students: { total: sumTotalStudents(courses) },
    messages: { pendingCount },
    grading:
      assignmentsResult.status === 'fulfilled'
        ? { pendingAssignmentsCount, pendingGradingSum }
        : { pendingAssignmentsCount: null, pendingGradingSum: null },
    calendar: { items: dueDateItems.map(serializeItem) },
    recent: { items: recentItems.map(serializeItem) },
    generatedAt: new Date().toISOString(),
    errors,
  });
}
