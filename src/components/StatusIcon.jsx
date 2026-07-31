import { CircleCheckBig, CircleDashed, Archive } from 'lucide-react';

const CONFIG = {
  published: { color: 'var(--ok)', label: 'Publicado', Icon: CircleCheckBig },
  unpublished: { color: 'var(--ink-soft)', label: 'Não publicado', Icon: CircleDashed },
  completed: { color: 'var(--ink-soft)', label: 'Encerrado', Icon: Archive },
};

/**
 * Small published/unpublished/completed indicator, reused for both a
 * course's workflow_state and an assignment's `published` boolean — callers
 * normalize their own field to one of these three status strings.
 */
export default function StatusIcon({ status }) {
  const { color, label, Icon } = CONFIG[status] || CONFIG.unpublished;

  return (
    <span className="status-icon" style={{ color }} title={label} role="img" aria-label={label}>
      <Icon size={16} strokeWidth={1.8} />
    </span>
  );
}
