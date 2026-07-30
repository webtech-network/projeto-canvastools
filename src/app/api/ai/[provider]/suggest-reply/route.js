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
  const { subject, sender, message } = body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Mensagem original é obrigatória.' }, { status: 400 });
  }

  try {
    const reply = await provider.suggestReply({
      apiKey,
      model: process.env[`${providerId.toUpperCase()}_MODEL`],
      context: { subject, sender, message },
    });
    return NextResponse.json({ reply });
  } catch (err) {
    const errorMessage = err.response?.data?.error?.message || err.message || 'Falha ao gerar sugestão de resposta.';
    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }
}
