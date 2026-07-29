const CONFIG = {
  published: { color: 'var(--ok)', label: 'Publicado' },
  unpublished: { color: 'var(--ink-soft)', label: 'Não publicado' },
  completed: { color: 'var(--ink-soft)', label: 'Encerrado' },
};

/**
 * Small published/unpublished/completed indicator, reused for both a
 * course's workflow_state and an assignment's `published` boolean — callers
 * normalize their own field to one of these three status strings.
 */
export default function StatusIcon({ status }) {
  const { color, label } = CONFIG[status] || CONFIG.unpublished;

  return (
    <span className="status-icon" style={{ color }} title={label} role="img" aria-label={label}>
      {status === 'published' && (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.4-4.2-4.2 1.4-1.4 2.8 2.8 6-6 1.4 1.4-7.4 7.4Z" />
        </svg>
      )}
      {status === 'completed' && (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 21V4a1 1 0 0 1 1-1h9l4 4v6l-4-1-4 1-4-1-2 1Z" />
        </svg>
      )}
      {status === 'unpublished' && (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
        </svg>
      )}
    </span>
  );
}
