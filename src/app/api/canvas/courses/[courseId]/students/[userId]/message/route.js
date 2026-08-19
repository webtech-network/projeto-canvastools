import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { createConversation } from '@/lib/canvasClient';
import { buildClient } from '@/lib/canvasSession';

// Backs StudentMessageModal.jsx's "Enviar mensagem" action on the Alunos
// screen — a single-recipient sibling of courses/[courseId]/messages
// (ComposeMessage.jsx's "send to every active student"), so no chunking is
// needed: `recipients` is always exactly one id.
export async function POST(request, { params }) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const { courseId, userId } = await params;
  const requestBody = await request.json().catch(() => null);
  const { subject, body } = requestBody || {};

  if (!body || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'O corpo da mensagem é obrigatório.' }, { status: 400 });
  }

  const client = buildClient(session);

  try {
    const conversation = await createConversation(client, {
      recipients: [userId],
      subject: subject?.trim() || undefined,
      body: body.trim(),
      contextCode: `course_${courseId}`,
    });
    return NextResponse.json({ conversation });
  } catch {
    return NextResponse.json({ error: 'Falha ao enviar a mensagem ao aluno.' }, { status: 502 });
  }
}
