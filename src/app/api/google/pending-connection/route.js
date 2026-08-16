import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';

// Single-use handoff, same pattern as /api/github/pending-connection: returns
// the connection stashed by google/oauth2/callback (if any) and immediately
// clears it from the session.
export async function GET() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const connection = session.googlePendingConnection || null;
  if (connection) {
    delete session.googlePendingConnection;
    await session.save();
  }

  return NextResponse.json({ connection });
}
