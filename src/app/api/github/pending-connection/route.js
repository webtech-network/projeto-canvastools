import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';

// Single-use handoff: returns the connection stashed by github/oauth2/callback
// (if any) and immediately clears it from the session — GithubConnection.jsx
// calls this once after being redirected back with ?github=connected, then
// persists the result into IndexedDB itself. A direct hit with nothing
// pending (e.g. reloading /perfil later) just returns { connection: null }.
export async function GET() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const connection = session.githubPendingConnection || null;
  if (connection) {
    delete session.githubPendingConnection;
    await session.save();
  }

  return NextResponse.json({ connection });
}
