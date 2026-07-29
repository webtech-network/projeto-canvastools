import { NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/canvasOAuth';
import { getSession } from '@/lib/session';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = request.cookies.get('oauth_state')?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    const response = NextResponse.redirect(new URL('/login?error=state_invalido', request.url));
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
    await session.save();
  } catch (err) {
    console.error('Falha no login OAuth do Canvas:', err.message);
    const response = NextResponse.redirect(new URL('/login?error=oauth_falhou', request.url));
    response.cookies.delete('oauth_state');
    return response;
  }

  const response = NextResponse.redirect(new URL('/courses', request.url));
  response.cookies.delete('oauth_state');
  return response;
}
