import { Inbox, Circle, CircleDot, Ban, CircleCheckBig } from 'lucide-react';

// Single source of truth for status labels + the icon representing each
// Kanban stage — shared by KanbanBoard.jsx's column headers, the condensed
// TaskCard.jsx layout (status is otherwise invisible in the Eisenhower
// view), TaskDetailModal.jsx's status <select>, WorkspaceFilterModal.jsx, and
// the icon legend in WorkspaceView.jsx's footer.
export const STATUS_META = {
  BACKLOG: { label: 'Backlog', Icon: Inbox },
  TODO: { label: 'Todo', Icon: Circle },
  DOING: { label: 'Doing', Icon: CircleDot },
  BLOCK: { label: 'Block', Icon: Ban },
  DONE: { label: 'Done', Icon: CircleCheckBig },
};
