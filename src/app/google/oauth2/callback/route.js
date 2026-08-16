import { NextResponse } from 'next/server';
import { exchangeCodeForToken, getGoogleUser, getAppBaseUrl } from '@/lib/googleOAuth';
import { getSession } from '@/lib/session';

// Same shape as src/app/github/oauth2/callback/route.js: the durable
// connection record lives in the browser's IndexedDB (see
// src/lib/googleConnection.js), not the server session — this route only
// stashes it in a one-time-use session field that
// /api/google/pending-connection reads once and clears. Unlike GitHub's
// token, Google's expires, so refreshToken/expiresAt ride along too.
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = request.cookies.get('google_oauth_state')?.value;
  const baseUrl = getAppBaseUrl();

  if (!code || !state || !cookieState || state !== cookieState) {
    const response = NextResponse.redirect(new URL('/perfil?tab=plataformas&google=erro', baseUrl));
    response.cookies.delete('google_oauth_state');
    return response;
  }

  try {
    const token = await exchangeCodeForToken(code);
    if (!token.refresh_token) {
      throw new Error('O Google não retornou um refresh_token. Revogue o acesso em myaccount.google.com/permissions e tente novamente.');
    }
    const user = await getGoogleUser(token.access_token);

    const session = await getSession();
    session.googlePendingConnection = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      email: user.emailAddress || null,
      name: user.displayName || null,
      photoLink: user.photoLink || null,
    };
    await session.save();
  } catch (err) {
    console.error('Falha no login OAuth do Google:', err.message);
    const response = NextResponse.redirect(new URL('/perfil?tab=plataformas&google=erro', baseUrl));
    response.cookies.delete('google_oauth_state');
    return response;
  }

  const response = NextResponse.redirect(new URL('/perfil?tab=plataformas&google=connected', baseUrl));
  response.cookies.delete('google_oauth_state');
  return response;
}
