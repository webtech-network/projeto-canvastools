function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '—';
  }
}

// Renders deriveRecentWindow()'s up-to-5 items (see src/lib/dashboard.js):
// up to 2 most-recent-past + the rest upcoming, within a ±7 day window.
export default function RecentDeadlines({ items, loading }) {
  const now = Date.now();

  return (
    <section className="dashboard-card">
      <h3>Prazos recentes</h3>
      {loading ? (
        <p className="lede">Carregando…</p>
      ) : !items || items.length === 0 ? (
        <p className="lede">Nenhuma atividade com prazo nos últimos ou próximos 7 dias.</p>
      ) : (
        <ul className="card-list">
          {items.map((item) => {
            const overdue = new Date(item.dueAt).getTime() < now;
            return (
              <li key={item.id}>
                <a href={item.htmlUrl} target="_blank" rel="noopener noreferrer" className="card-link">
                  <span>
                    <span className="card-title">{item.name}</span>
                    <span className="card-meta">{item.courseName}</span>
                  </span>
                  <span className={`deadline-tag${overdue ? ' overdue' : ' upcoming'}`}>{formatDate(item.dueAt)}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
