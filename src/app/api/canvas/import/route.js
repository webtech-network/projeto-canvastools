import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { createClient, createQuestion } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';
import { validateStructural, toCanvasPayload } from '@/lib/quizValidation';

export async function POST(request) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { courseId, quizId, questions } = body || {};

  if (!courseId || !quizId || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json(
      { error: 'Requisição inválida: courseId, quizId e ao menos uma questão são obrigatórios.' },
      { status: 400 },
    );
  }

  // Defense-in-depth: the client already ran this check, but never trust the client alone.
  const structural = validateStructural({ course_id: courseId, quiz_id: quizId, questions });
  if (!structural.valid) {
    return NextResponse.json({ error: 'Questões inválidas.', details: structural.errors }, { status: 400 });
  }

  const client = createClient({
    baseUrl: session.baseUrl,
    token: session.accessToken,
    onUnauthorized: async () => {
      const refreshed = await refreshAccessToken(session.refreshToken);
      return refreshed.access_token;
    },
  });

  const results = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    try {
      const payload = toCanvasPayload(q);
      const created = await createQuestion(client, courseId, quizId, payload);
      results.push({ index: i, name: q.question_name, success: true, canvasId: created.id });
    } catch (err) {
      const data = err.response?.data;
      const message = data?.errors?.[0]?.message || (typeof data === 'string' ? data : data ? JSON.stringify(data) : err.message);
      results.push({ index: i, name: q.question_name, success: false, error: message });
    }
  }

  return NextResponse.json({ results });
}
