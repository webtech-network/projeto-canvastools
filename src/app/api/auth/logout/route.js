import { NextResponse } from 'next/server';
import { revokeToken, getAppBaseUrl } from '@/lib/canvasOAuth';
import { getSession } from '@/lib/session';

export async function POST() {
  const session = await getSession();
  if (session.accessToken) {
    await revokeToken(session.accessToken);
  }
  session.destroy();
  return NextResponse.redirect(new URL('/login', getAppBaseUrl()), { status: 303 });
}
