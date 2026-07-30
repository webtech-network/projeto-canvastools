import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { createClient, addCourseFavorite, removeCourseFavorite } from '@/lib/canvasClient';
import { refreshAccessToken } from '@/lib/canvasOAuth';

function buildClient(session) {
  return createClient({
    baseUrl: session.baseUrl,
    token: session.accessToken,
    onUnauthorized: async () => {
      const refreshed = await refreshAccessToken(session.refreshToken);
      return refreshed.access_token;
    },
  });
}

export async function POST(request, { params }) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const { courseId } = await params;
  try {
    await addCourseFavorite(buildClient(session), courseId);
    return NextResponse.json({ is_favorite: true });
  } catch {
    return NextResponse.json({ error: 'Falha ao favoritar o curso.' }, { status: 502 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const { courseId } = await params;
  try {
    await removeCourseFavorite(buildClient(session), courseId);
    return NextResponse.json({ is_favorite: false });
  } catch {
    return NextResponse.json({ error: 'Falha ao desfavoritar o curso.' }, { status: 502 });
  }
}
