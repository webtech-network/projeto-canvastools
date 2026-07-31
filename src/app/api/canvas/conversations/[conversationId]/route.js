import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { getConversation, archiveConversation } from '@/lib/canvasClient';
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
