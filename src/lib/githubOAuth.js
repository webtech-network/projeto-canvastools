const REQUIRED_ENV = ['GITHUB_OAUTH_CLIENT_ID', 'GITHUB_OAUTH_CLIENT_SECRET', 'GITHUB_OAUTH_REDIRECT_URI'];

// Assumes a classic GitHub OAuth App (not a GitHub App — no installation
// flow, no webhooks, and its access tokens don't expire by default, unlike
// GitHub Apps' optional expiring user tokens), so there's no refresh-token
// dance to implement here, unlike canvasOAuth.js.
function getConfig() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Configuração OAuth do GitHub incompleta. Defina no .env: ${missing.join(', ')}.`);
  }
  return {
    clientId: process.env.GITHUB_OAUTH_CLIENT_ID,
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
    redirectUri: process.env.GITHUB_OAUTH_REDIRECT_URI,
    scopes: process.env.GITHUB_OAUTH_SCOPES || 'read:user repo project',
  };
}

// Independent of canvasOAuth.js's own getAppBaseUrl() — deliberately not
// shared, so the two OAuth integrations stay decoupled (e.g. an install
// that only configures one of the two doesn't need the other's env vars
// present just to derive an origin).
export function getAppBaseUrl() {
  const { redirectUri } = getConfig();
  return new URL(redirectUri).origin;
}

export function getAuthorizeUrl(state) {
  const { clientId, redirectUri, scopes } = getConfig();
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  if (scopes) {
    url.searchParams.set('scope', scopes);
  }
  return url.toString();
}

/** Exchanges an authorization code for { access_token, scope, token_type }. */
export async function exchangeCodeForToken(code) {
  const { clientId, clientSecret, redirectUri } = getConfig();
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }).toString(),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Falha na comunicação OAuth com o GitHub (HTTP ${response.status}): ${text}`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(`GitHub recusou a troca do código: ${data.error_description || data.error}`);
  }
  return data;
}

/** Fetches the authenticated user's profile — used right after the token
 * exchange to get login/avatar_url/name for display, without needing the
 * user to type anything. */
export async function getGithubUser(accessToken) {
  const response = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(`Falha ao buscar o perfil do GitHub (HTTP ${response.status}).`);
  }
  return response.json();
}

/** Best-effort server-side revocation, used on disconnect. Never throws. */
export async function revokeToken(accessToken) {
  try {
    const { clientId, clientSecret } = getConfig();
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    await fetch(`https://api.github.com/applications/${clientId}/grant`, {
      method: 'DELETE',
      headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
      body: JSON.stringify({ access_token: accessToken }),
    });
  } catch {
    // disconnect should still clear local state even if revocation fails
  }
}
