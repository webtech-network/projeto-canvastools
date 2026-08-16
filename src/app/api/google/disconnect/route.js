import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { revokeToken } from '@/lib/googleOAuth';

// The durable copy of the token lives in the browser's IndexedDB, not the
// session — this route's job is just best-effort revocation on Google's
// side; GoogleConnection.jsx clears its own IndexedDB record regardless of
// whether this call succeeds. Same shape as /api/github/disconnect.
export async function POST(request) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const accessToken = body?.accessToken;
  if (accessToken) {
    await revokeToken(accessToken);
  }

  return NextResponse.json({ ok: true });
}
