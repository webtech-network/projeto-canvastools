import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { getSessionOptions } from '@/lib/session';
import { refreshAccessToken, getAppBaseUrl } from '@/lib/canvasOAuth';

// Refresh proactively this far ahead of actual expiry. This margin — not
// same-request cookie propagation — is what keeps the *current* request
// correct: the token in hand is still valid regardless of whether the
// refreshed cookie is visible to a Server Component rendered later in this
// same request (that exact timing is ambiguous across Next.js versions).
// The next navigation will read the refreshed cookie from the browser.
const REFRESH_SAFETY_MARGIN_MS = 5 * 60 * 1000;

export async function proxy(request) {
  const response = NextResponse.next();
  const session = await getIronSession(request, response, getSessionOptions());
  const isApi = request.nextUrl.pathname.startsWith('/api/');

  if (!session.accessToken || !session.baseUrl) {
    if (isApi) {
      return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', getAppBaseUrl()));
  }

  const expiringSoon =
    !session.accessTokenExpiresAt || session.accessTokenExpiresAt - Date.now() < REFRESH_SAFETY_MARGIN_MS;

  if (expiringSoon) {
    try {
      const refreshed = await refreshAccessToken(session.refreshToken);
      session.accessToken = refreshed.access_token;
      session.accessTokenExpiresAt = Date.now() + refreshed.expires_in * 1000;
      await session.save();
    } catch {
      session.destroy();
      if (isApi) {
        return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', getAppBaseUrl()));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/courses/:path*',
    '/api/canvas/:path*',
    '/questoes/:path*',
    '/api/ai/:path*',
    '/perfil/:path*',
    '/mensagens/:path*',
    '/api/dashboard/:path*',
    '/tutorial/:path*',
    '/sobre/:path*',
    '/api/github/:path*',
    '/github/:path*',
    '/api/google/:path*',
    '/google/:path*',
  ],
};
