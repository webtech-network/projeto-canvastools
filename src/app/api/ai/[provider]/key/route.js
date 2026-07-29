import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { getProvider } from '@/lib/aiProviders';

function resolveProvider(providerId) {
  try {
    return getProvider(providerId);
  } catch {
    return null;
  }
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const { provider: providerId } = await params;
  const provider = resolveProvider(providerId);
  if (!provider) {
    return NextResponse.json({ error: 'Provedor de IA desconhecido.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const { apiKey } = body || {};

  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'Chave de API é obrigatória.' }, { status: 400 });
  }

  const result = await provider.validateApiKey(apiKey);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  session.aiApiKeys = { ...session.aiApiKeys, [providerId]: apiKey };
  await session.save();

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const { provider: providerId } = await params;
  if (!resolveProvider(providerId)) {
    return NextResponse.json({ error: 'Provedor de IA desconhecido.' }, { status: 404 });
  }

  if (session.aiApiKeys && providerId in session.aiApiKeys) {
    const { [providerId]: _removed, ...rest } = session.aiApiKeys;
    session.aiApiKeys = rest;
    await session.save();
  }

  return NextResponse.json({ ok: true });
}
