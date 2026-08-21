import { getSession, isSessionValid } from '@/lib/session';
import { WorkspaceProvider } from '@/components/WorkspaceProvider';
import WorkspaceView from '@/components/WorkspaceView';

// No Canvas data fetched server-side — projects/tasks live entirely in the
// browser's IndexedDB, and Canvas course/assignment/student lookups for the
// project/task pickers are client-driven through the existing cached
// /api/canvas/courses route (same pattern as courses/page.jsx not blocking
// navigation on a Canvas round-trip).
export default async function TarefasPage() {
  const session = await getSession();
  if (!isSessionValid(session)) {
    return null;
  }

  return (
    <main className="page page-tarefas">
      <h1>Tarefas</h1>
      <p className="lede">Organize suas tarefas em um quadro Kanban ou na matriz de Eisenhower.</p>

      <WorkspaceProvider>
        <WorkspaceView />
      </WorkspaceProvider>
    </main>
  );
}
