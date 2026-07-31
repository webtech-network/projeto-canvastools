import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { addCourseFavorite, removeCourseFavorite } from '@/lib/canvasClient';
import { buildClient } from '@/lib/canvasSession';

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
