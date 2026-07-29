import { NextResponse } from 'next/server';
import { revokeToken } from '@/lib/canvasOAuth';
import { getSession } from '@/lib/session';

export async function POST(request) {
  const session = await getSession();
  if (session.accessToken) {
    await revokeToken(session.accessToken);
  }
  session.destroy();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
