import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'canvasquiz_session';

/** Validated lazily (not at import time) so this module can be imported by
 * middleware/route/page files without crashing anything that merely touches
 * the file before .env is loaded. */
export function getSessionOptions() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      'SESSION_SECRET precisa estar definido no .env com pelo menos 32 caracteres. Gere um com: openssl rand -hex 32',
    );
  }
  return {
    cookieName: COOKIE_NAME,
    password,
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      // Canvas's own refresh token never expires (see canvasOAuth.js), and
      // src/proxy.js re-saves this cookie — renewing maxAge — every time it
      // refreshes the access token. So this ceiling only matters for users
      // who go this long *without opening the app at all*; anything shorter
      // caused daily forced re-logins even though the refresh token was fine.
      maxAge: 60 * 60 * 24 * 30, // 30d, rolling

    },
  };
}

/** For Server Components and Route Handlers (reads/writes via next/headers cookies()). */
export async function getSession() {
  return getIronSession(await cookies(), getSessionOptions());
}

export function isSessionValid(session) {
  return Boolean(session?.accessToken && session?.baseUrl);
}
