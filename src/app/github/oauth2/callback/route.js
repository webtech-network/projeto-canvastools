import { NextResponse } from 'next/server';
import { exchangeCodeForToken, getGithubUser, getAppBaseUrl } from '@/lib/githubOAuth';
import { getSession } from '@/lib/session';

// Unlike Canvas's oauth2/callback (which writes access/refresh tokens
// directly into the durable session), this only stashes the token in a
// one-time-use session field — src/lib/githubConnection.js's durable copy
// lives in the browser's IndexedDB instead. api/github/pending-connection
// reads this field once and clears it.
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = request.cookies.get('github_oauth_state')?.value;
  const baseUrl = getAppBaseUrl();

  if (!code || !state || !cookieState || state !== cookieState) {
    const response = NextResponse.redirect(new URL('/perfil?tab=github&github=erro', baseUrl));
    response.cookies.delete('github_oauth_state');
    return response;
  }

  try {
    const token = await exchangeCodeForToken(code);
    const user = await getGithubUser(token.access_token);

    const session = await getSession();
    session.githubPendingConnection = {
      accessToken: token.access_token,
      scopes: token.scope || '',
      login: user.login,
      avatarUrl: user.avatar_url,
      name: user.name || null,
    };
    await session.save();
  } catch (err) {
    console.error('Falha no login OAuth do GitHub:', err.message);
    const response = NextResponse.redirect(new URL('/perfil?tab=github&github=erro', baseUrl));
    response.cookies.delete('github_oauth_state');
    return response;
  }

  const response = NextResponse.redirect(new URL('/perfil?tab=github&github=connected', baseUrl));
  response.cookies.delete('github_oauth_state');
  return response;
}
