import { NextResponse } from 'next/server';
import { getAuthorizeUrl } from '@/lib/googleOAuth';

export async function GET() {
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(getAuthorizeUrl(state));
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300,
    path: '/',
  });
  return response;
}
