import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { validateApiKey } from '@/lib/aiProviders/openai';

export async function POST(request) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { apiKey } = body || {};

  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'Chave de API é obrigatória.' }, { status: 400 });
  }

  const result = await validateApiKey(apiKey);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  session.aiApiKeys = { ...session.aiApiKeys, openai: apiKey };
  await session.save();

  return NextResponse.json({ ok: true });
}
