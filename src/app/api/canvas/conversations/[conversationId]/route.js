import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { createClient, getConversation } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';

// Backs the "expand row" thread view on the messages screens — fetched only
// when a row is actually expanded, not eagerly for every conversation.
export async function GET(request, { params }) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const { conversationId } = await params;

  const client = createClient({
    baseUrl: session.baseUrl,
    token: session.accessToken,
    onUnauthorized: async () => {
      const refreshed = await refreshAccessToken(session.refreshToken);
      return refreshed.access_token;
    },
  });

  try {
    const conversation = await getConversation(client, conversationId);
    return NextResponse.json({ conversation });
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar a conversa completa.' }, { status: 502 });
  }
}
