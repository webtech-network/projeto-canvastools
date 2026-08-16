import { NextResponse } from 'next/server';
import { exchangeCodeForToken, getAppBaseUrl } from '@/lib/canvasOAuth';
import { getSession } from '@/lib/session';
import { createClient, getSelf } from '@/lib/canvasClient';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = request.cookies.get('oauth_state')?.value;
  const baseUrl = getAppBaseUrl();

  if (!code || !state || !cookieState || state !== cookieState) {
    const response = NextResponse.redirect(new URL('/login?error=state_invalido', baseUrl));
    response.cookies.delete('oauth_state');
    return response;
  }

  try {
    const token = await exchangeCodeForToken(code);
    const session = await getSession();
    session.baseUrl = process.env.CANVAS_DOMAIN.replace(/\/$/, '');
    session.accessToken = token.access_token;
    session.refreshToken = token.refresh_token;
    session.accessTokenExpiresAt = Date.now() + token.expires_in * 1000;
    session.user = token.user;

    // The OAuth token response's own `user` field (just set above) never
    // carries an avatar — fetched once here, at login, and cached in the
    // session so the topbar's avatar menu doesn't need an extra Canvas call
    // on every page render. Best-effort: a failure here still leaves a
    // perfectly usable session (session.user), just without a picture — the
    // avatar menu falls back to a generic icon.
    try {
      const client = createClient({ baseUrl: session.baseUrl, token: session.accessToken });
      const profile = await getSelf(client);
      if (profile?.avatar_url) {
        session.user = { ...session.user, avatar_url: profile.avatar_url };
      }
    } catch (err) {
      console.error('Falha ao buscar o avatar do Canvas:', err.message);
    }

    await session.save();
  } catch (err) {
    console.error('Falha no login OAuth do Canvas:', err.message);
    const response = NextResponse.redirect(new URL('/login?error=oauth_falhou', baseUrl));
    response.cookies.delete('oauth_state');
    return response;
  }

  const response = NextResponse.redirect(new URL('/courses', baseUrl));
  response.cookies.delete('oauth_state');
  return response;
}
