'use client';

import { useWorkspaceScope } from './WorkspaceScopeProvider';
import { BASE_WORKSPACE_ID } from '@/lib/workspaces/workspacesRepo';

// Atividades is a Server Component reached by a single-course URL, not a
// list to filter — so unlike CourseBrowser.jsx there's nothing to hide here.
// Instead this just surfaces, non-blockingly, when the course being viewed
// isn't part of the active workspace (reached via direct URL, a bookmark, or
// simply switching workspace after opening the tab) — access itself is
// never denied.
export default function ActiveWorkspaceCourseBanner({ courseId }) {
  const { activeWorkspaceId, activeWorkspace, getVisibleResourceIds } = useWorkspaceScope();

  if (activeWorkspaceId === BASE_WORKSPACE_ID) return null;
  const visibleCourseIds = getVisibleResourceIds('course');
  if (visibleCourseIds?.has(String(courseId))) return null;

  return (
    <p className="alert alert-warning" role="status">
      Este curso não faz parte do workspace ativo ({activeWorkspace.name}).
    </p>
  );
}
