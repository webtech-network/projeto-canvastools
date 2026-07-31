import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { getProvider } from '@/lib/aiProviders';

export async function POST(request, { params }) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const { provider: providerId } = await params;
  let provider;
  try {
    provider = getProvider(providerId);
  } catch {
    return NextResponse.json({ error: 'Provedor de IA desconhecido.' }, { status: 404 });
  }

  const apiKey = session.aiApiKeys?.[providerId];
  if (!apiKey) {
    return NextResponse.json({ error: `Nenhuma chave de API configurada para ${provider.label}.` }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { text } = body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Texto da mensagem é obrigatório.' }, { status: 400 });
  }

  try {
    const improved = await provider.improveMessage({
      apiKey,
      model: process.env[`${providerId.toUpperCase()}_MODEL`],
      text,
    });
    return NextResponse.json({ improved });
  } catch (err) {
    const errorMessage = err.response?.data?.error?.message || err.message || 'Falha ao melhorar a mensagem.';
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }
}
