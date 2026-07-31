import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { listCourses, listConversations } from '@/lib/canvasClient';
import { buildClient } from '@/lib/canvasSession';

// Backs MessageBrowser.jsx's client-side stale-while-revalidate fetch —
// moved out of mensagens/page.jsx (a Server Component) so navigating to
// /mensagens no longer blocks on this Canvas round-trip before the page can
// render, same fix as /api/canvas/courses.
export async function GET() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const client = buildClient(session);

  const rawCourses = await listCourses(client);
  const favoriteCourses = rawCourses.filter((c) => c.is_favorite);

  // A 401 here (as opposed to elsewhere in the app) almost always means the
  // Canvas Developer Key has "Enforce Scopes" on without the Conversations
  // API in its allowed list — a Canvas-admin config issue, not a bug — so
  // this is caught locally instead of failing the whole request.
  //
  // Scoped to favorite courses only, and in a single call: Canvas's
  // `filter[]` accepts several course contexts at once and OR's them
  // together, so one Inbox call covers every favorite course.
  let conversations = [];
  let loadError = null;
  if (favoriteCourses.length > 0) {
    try {
      conversations = await listConversations(client, {
        filter: favoriteCourses.map((c) => `course_${c.id}`),
      });
    } catch {
      loadError =
        'Não foi possível carregar as mensagens. Se o problema persistir, verifique se a Developer Key do Canvas usada por este app tem o escopo de Conversas (Conversations API) habilitado.';
    }
  }

  return NextResponse.json({ courses: favoriteCourses, conversations, loadError });
}
