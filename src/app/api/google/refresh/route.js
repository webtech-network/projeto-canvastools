import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { refreshAccessToken } from '@/lib/googleOAuth';

// No equivalent under /api/github/ — GitHub's classic OAuth App tokens don't
// expire, so githubConnection.js never needs a refresh round-trip. Google's
// access token does (~1h), and refreshing needs the client_secret, which
// can't reach the browser — so this is a stateless pass-through: the
// browser sends the refresh_token it already has in IndexedDB (see
// googleConnection.js's getValidAccessToken), this route uses it once
// against Google's token endpoint, and forgets it immediately. Nothing is
// persisted server-side.
export async function POST(request) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const refreshToken = body?.refreshToken;
  if (!refreshToken) {
    return NextResponse.json({ error: 'refreshToken ausente.' }, { status: 400 });
  }

  try {
    const refreshed = await refreshAccessToken(refreshToken);
    return NextResponse.json({
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    });
  } catch {
    return NextResponse.json(
      { error: 'Falha ao renovar a conexão com o Google Drive. Reconecte em /perfil.' },
      { status: 401 },
    );
  }
}
