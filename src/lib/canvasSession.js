import { createClient } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';

/**
 * Builds a Canvas API client from a validated iron-session, wiring the
 * OAuth-401-retry callback the same way every API route needs it. Shared so
 * route handlers don't each re-declare this identical boilerplate.
 */
export function buildClient(session) {
  return createClient({
    baseUrl: session.baseUrl,
    token: session.accessToken,
    onUnauthorized: async () => {
      const refreshed = await refreshAccessToken(session.refreshToken);
      return refreshed.access_token;
    },
  });
}
