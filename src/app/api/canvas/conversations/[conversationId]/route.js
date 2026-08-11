import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { getConversation, archiveConversation, replyToConversation } from '@/lib/canvasClient';
import { buildClient } from '@/lib/canvasSession';

// Backs the "expand row" thread view on the messages screens — fetched only
// when a row is actually expanded, not eagerly for every conversation.
export async function GET(request, { params }) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const { conversationId } = await params;

  try {
    const conversation = await getConversation(buildClient(session), conversationId);
    return NextResponse.json({ conversation });
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar a conversa completa.' }, { status: 502 });
  }
}

// Backs the "Arquivar" button on the expanded-row action bar.
export async function PUT(request, { params }) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const { conversationId } = await params;

  try {
    const conversation = await archiveConversation(buildClient(session), conversationId);
    return NextResponse.json({ conversation });
  } catch {
    return NextResponse.json({ error: 'Falha ao arquivar a mensagem.' }, { status: 502 });
  }
}

// Backs the "Enviar resposta pelo Canvas" action in the AI-assisted reply
// modal — sends the (professor-edited) suggested reply as a real message on
// the existing conversation thread.
export async function POST(request, { params }) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const { conversationId } = await params;
  const requestBody = await request.json().catch(() => null);
  const body = requestBody?.body;
  if (!body || typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'A resposta não pode ficar vazia.' }, { status: 400 });
  }

  try {
    const conversation = await replyToConversation(buildClient(session), conversationId, body);
    return NextResponse.json({ conversation });
  } catch {
    return NextResponse.json({ error: 'Falha ao enviar a resposta pelo Canvas.' }, { status: 502 });
  }
}
