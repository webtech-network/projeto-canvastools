const REQUIRED_ENV = [
  'CANVAS_DOMAIN',
  'CANVAS_OAUTH_CLIENT_ID',
  'CANVAS_OAUTH_CLIENT_SECRET',
  'CANVAS_OAUTH_REDIRECT_URI',
];

function getConfig() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Configuração OAuth do Canvas incompleta. Defina no .env: ${missing.join(', ')}.`);
  }
  return {
    domain: process.env.CANVAS_DOMAIN.replace(/\/$/, ''),
    clientId: process.env.CANVAS_OAUTH_CLIENT_ID,
    clientSecret: process.env.CANVAS_OAUTH_CLIENT_SECRET,
    redirectUri: process.env.CANVAS_OAUTH_REDIRECT_URI,
    scopes: process.env.CANVAS_OAUTH_SCOPES || '',
  };
}

export function getAuthorizeUrl(state) {
  const { domain, clientId, redirectUri, scopes } = getConfig();
  const url = new URL(`${domain}/login/oauth2/auth`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  if (scopes) {
    url.searchParams.set('scope', scopes);
  }
  return url.toString();
}

async function postToken(body) {
  const { domain } = getConfig();
  const response = await fetch(`${domain}/login/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Falha na comunicação OAuth com o Canvas (HTTP ${response.status}): ${text}`);
  }
  return response.json();
}

/** Exchanges an authorization code for { access_token, refresh_token, expires_in, user, ... }. */
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
 * Refreshes an access token. Canvas does not return a new refresh_token here
 * — the original one is reused indefinitely.
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

/** Best-effort server-side revocation, used at logout. Never throws. */
export async function revokeToken(accessToken) {
  try {
    const { domain } = getConfig();
    await fetch(`${domain}/login/oauth2/token`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // logout should still clear the local session even if revocation fails
  }
}
