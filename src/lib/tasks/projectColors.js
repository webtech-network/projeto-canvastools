// Curated palette offered when picking a project color — base (fully
// saturated) hues only. Each is mixed down to a soft tint at the point of
// use (see projectCardStyle below) via CSS color-mix() against
// var(--paper-raised), so the same hex reads as a pale pastel in light mode
// and a muted dark tint in dark mode without needing separate light/dark
// values per color.
//
// 16 hues (1 neutral + 15 colors), picked from Tailwind's own 500-shade
// values but filtered by actual CIELAB ΔE distance, not just hue angle — hue
// angle alone is misleading here: 'violet' (#8b5cf6) and 'purple' (#a855f7)
// sit 12° apart in hue but only ΔE≈10 apart in Lab (worse than 'red' and the
// former 'rose' at ΔE≈15, which is what actually got reported as "too
// close"). 'yellow' (too close to 'amber', ΔE≈16) and 'violet' were dropped
// for the same reason; 'rose' was dropped outright since 'red' already
// covers that hue. 'brown' was added back in to keep the count at 16 without
// reintroducing a close pair — every remaining pair is ΔE≥18.6, clearly
// distinguishable even after both get diluted to the same 16% tint in
// projectCardStyle. Ordered warm → cool → warm again (red through pink, with
// 'brown' grouped near red/orange/amber since it's a dark shade of that same
// hue family) so the picker still reads as a natural rainbow.
export const PROJECT_COLORS = [
  { id: 'slate', label: 'Ardósia', hex: '#64748b' },
  { id: 'red', label: 'Vermelho', hex: '#ef4444' },
  { id: 'orange', label: 'Laranja', hex: '#f97316' },
  { id: 'amber', label: 'Âmbar', hex: '#f59e0b' },
  { id: 'brown', label: 'Marrom', hex: '#92400e' },
  { id: 'lime', label: 'Lima', hex: '#84cc16' },
  { id: 'green', label: 'Verde', hex: '#22c55e' },
  { id: 'emerald', label: 'Esmeralda', hex: '#10b981' },
  { id: 'teal', label: 'Verde-azulado', hex: '#14b8a6' },
  { id: 'cyan', label: 'Ciano', hex: '#06b6d4' },
  { id: 'sky', label: 'Azul-celeste', hex: '#0ea5e9' },
  { id: 'blue', label: 'Azul', hex: '#3b82f6' },
  { id: 'indigo', label: 'Índigo', hex: '#6366f1' },
  { id: 'purple', label: 'Roxo', hex: '#a855f7' },
  { id: 'fuchsia', label: 'Fúcsia', hex: '#d946ef' },
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
