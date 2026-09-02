import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { listCourseStudents } from '@/lib/canvasClient';
import { buildClient } from '@/lib/canvasSession';

// Backs TaskDetailModal.jsx's student picker (tasks feature) — a
// single, course-scoped call, fetched lazily once a Canvas-linked project is
// selected, then cached client-side via canvasResolution.js (the whole
// roster is cached per course, not one student at a time — there's no
// single-student-by-id Canvas endpoint to call instead).
export async function GET(request, { params }) {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return NextResponse.json({ error: 'Sessão inválida. Faça login novamente.' }, { status: 401 });
  }

  const { courseId } = await params;

  try {
    const students = await listCourseStudents(buildClient(session), courseId);
    return NextResponse.json({ students });
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar os alunos do curso.' }, { status: 502 });
  }
}
