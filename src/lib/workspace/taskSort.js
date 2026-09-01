// Priority-rank ordering shared by KanbanColumn.jsx (within a status),
// EisenhowerQuadrant.jsx (within a quadrant) and TaskTable.jsx (its default
// sort). `priorityRank` is a 0 (highest) – 9 (lowest) integer every task
// starts at 3 (tasksRepo.js's createTask) — `?? 3` here covers tasks written
// before this field existed, so they sort exactly where a freshly created
// task would. Ties are broken first by urgency, then importance, per spec:
// "Caso os valores sejam iguais, adota-se a prioridade pela urgência e em
// seguida pela importância."
export function comparePriority(a, b) {
  const rankA = a.priorityRank ?? 3;
  const rankB = b.priorityRank ?? 3;
  if (rankA !== rankB) return rankA - rankB;
  const urgentA = a.priority?.urgent ? 1 : 0;
  const urgentB = b.priority?.urgent ? 1 : 0;
  if (urgentA !== urgentB) return urgentB - urgentA;
  const importantA = a.priority?.important ? 1 : 0;
  const importantB = b.priority?.important ? 1 : 0;
  return importantB - importantA;
}

export function sortTasksByPriority(tasks) {
  return [...tasks].sort(comparePriority);
}
