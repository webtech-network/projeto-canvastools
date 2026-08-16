const REQUIRED_ENV = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_REDIRECT_URI'];

// Unlike githubOAuth.js (classic OAuth App, tokens never expire), Google's
// access tokens expire in ~1h — so, like canvasOAuth.js, this needs a real
// refreshAccessToken(). access_type=offline + prompt=consent (see
// getAuthorizeUrl) are what make Google actually hand back a refresh_token,
// which by default it only does on a user's very first consent.
function getConfig() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Configuração OAuth do Google incompleta. Defina no .env: ${missing.join(', ')}.`);
  }
  return {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    scopes: process.env.GOOGLE_OAUTH_SCOPES || 'https://www.googleapis.com/auth/drive.appdata',
  };
}

// Independent of canvasOAuth.js/githubOAuth.js's own getAppBaseUrl() —
// deliberately not shared, same reasoning as githubOAuth.js's own comment.
export function getAppBaseUrl() {
  const { redirectUri } = getConfig();
  return new URL(redirectUri).origin;
}

export function getAuthorizeUrl(state) {
  const { clientId, redirectUri, scopes } = getConfig();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

async function postToken(body) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Falha na comunicação OAuth com o Google (HTTP ${response.status}): ${data.error_description || data.error || ''}`);
  }
  return data;
}

/** Exchanges an authorization code for { access_token, refresh_token, expires_in, ... }. */
export async function exchangeCodeForToken(code) {
  const { clientId, clientSecret, redirectUri } = getConfig();
  return postToken({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });
}

/**
 * Refreshes an access token. Like Canvas, Google does not return a new
 * refresh_token here — the original one is reused indefinitely.
 */
export async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = getConfig();
  return postToken({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}

/**
 * Fetches the authenticated user's profile via Drive's own `about` endpoint
 * rather than Google's generic userinfo endpoint — the latter would require
 * an extra `userinfo.email`/`profile` scope, breaking the drive.appdata-only
 * least-privilege scope this integration is built around.
 */
export async function getGoogleUser(accessToken) {
  const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Falha ao buscar o perfil do Google (HTTP ${response.status}).`);
  }
  const data = await response.json();
  return data.user || {};
}

/** Best-effort server-side revocation, used on disconnect. Never throws. */
export async function revokeToken(accessToken) {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch {
    // disconnect should still clear local state even if revocation fails
  }
}
