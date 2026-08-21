// Curated palette offered when picking a project color — base (fully
// saturated) hues only. Each is mixed down to a soft tint at the point of
// use (see projectCardStyle below) via CSS color-mix() against
// var(--paper-raised), so the same hex reads as a pale pastel in light mode
// and a muted dark tint in dark mode without needing separate light/dark
// values per color.
export const PROJECT_COLORS = [
  { id: 'slate', label: 'Ardósia', hex: '#64748b' },
  { id: 'red', label: 'Vermelho', hex: '#ef4444' },
  { id: 'orange', label: 'Laranja', hex: '#f97316' },
  { id: 'amber', label: 'Âmbar', hex: '#f59e0b' },
  { id: 'green', label: 'Verde', hex: '#22c55e' },
  { id: 'teal', label: 'Verde-azulado', hex: '#14b8a6' },
  { id: 'blue', label: 'Azul', hex: '#3b82f6' },
  { id: 'purple', label: 'Roxo', hex: '#a855f7' },
  { id: 'pink', label: 'Rosa', hex: '#ec4899' },
];

const COLOR_BY_HEX = new Map(PROJECT_COLORS.map((c) => [c.hex, c]));

export function isValidProjectColor(hex) {
  return COLOR_BY_HEX.has(hex);
}

// The actual "soft background" — a light tint of the project's chosen hue,
// used as a task card's inline background (TaskCard.jsx). 16% keeps it
// subtle enough that status/priority icons and text stay legible in both
// themes; undefined (no inline style) when the project has no color or
// isn't found, so cards fall back to the default .kanban-card background.
export function projectCardStyle(project) {
  if (!project?.color || !isValidProjectColor(project.color)) return undefined;
  return { backgroundColor: `color-mix(in srgb, ${project.color} 16%, var(--paper-raised))` };
}
