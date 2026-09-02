// Pure mapping between a Task's { urgent, important } booleans and the
// Eisenhower matrix's four quadrant identifiers — no IndexedDB dependency,
// so it's safely importable from both EisenhowerMatrix.jsx (grouping tasks
// for render) and its onDragEnd handler (decoding a droppable id back into
// priority booleans), same "pure function, shared both directions" shape as
// promptResolution.js's resolvePrompt.

export const QUADRANTS = {
  URGENT_IMPORTANT: 'urgent-important',
  URGENT_NOT_IMPORTANT: 'urgent-not-important',
  NOT_URGENT_IMPORTANT: 'not-urgent-important',
  NOT_URGENT_NOT_IMPORTANT: 'not-urgent-not-important',
};

export function quadrantOf(priority) {
  const urgent = Boolean(priority?.urgent);
  const important = Boolean(priority?.important);
  if (urgent && important) return QUADRANTS.URGENT_IMPORTANT;
  if (urgent && !important) return QUADRANTS.URGENT_NOT_IMPORTANT;
  if (!urgent && important) return QUADRANTS.NOT_URGENT_IMPORTANT;
  return QUADRANTS.NOT_URGENT_NOT_IMPORTANT;
}

export function priorityForQuadrant(quadrant) {
  switch (quadrant) {
    case QUADRANTS.URGENT_IMPORTANT:
      return { urgent: true, important: true };
    case QUADRANTS.URGENT_NOT_IMPORTANT:
      return { urgent: true, important: false };
    case QUADRANTS.NOT_URGENT_IMPORTANT:
      return { urgent: false, important: true };
    default:
      return { urgent: false, important: false };
  }
}
