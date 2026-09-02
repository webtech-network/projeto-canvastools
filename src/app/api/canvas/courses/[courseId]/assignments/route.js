import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { listAssignments } from '@/lib/canvasClient';
import { buildClient } from '@/lib/canvasSession';

// Backs TaskDetailModal.jsx's assignment picker (tasks feature) — a
// single, course-scoped call, fetched lazily once a Canvas-linked project is
// selected, then cached client-side via canvasResolution.js.
export async function GET(request, { params }) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const { courseId } = await params;

  try {
    const assignments = await listAssignments(buildClient(session), courseId);
    return NextResponse.json({ assignments });
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar as atividades do curso.' }, { status: 502 });
  }
}
