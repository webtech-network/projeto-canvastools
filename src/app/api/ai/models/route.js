import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';

// Unlike /api/ai/keys (which deliberately gates real secret values behind
// the encrypted-export flow, see that route's own comment), model
// preferences aren't sensitive — just a provider-scoped string like
// "gpt-4o" — so this is safe to expose unconditionally for the settings
// export to include even when the professor doesn't opt into "incluir
// credenciais".
export async function GET() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  return NextResponse.json({ models: session.aiModels || {} });
}
