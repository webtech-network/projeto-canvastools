'use client';

import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

// Each row is a plain <li> (not a <Link>) driving navigation via
// router.push(), not an anchor — an <a> can't be nested inside another <a>
// per the HTML spec, and the Canvas LMS icon right after the title has to
// be a real, separately-clickable <a target="_blank"> of its own. The row
// still exposes role="link" + tabIndex/onKeyDown so it stays keyboard- and
// screen-reader-reachable despite not being a native anchor.
function PendingGradingItem({ item }) {
  const router = useRouter();
  const gradeUrl = `/courses/${item.courseId}/assignments/${item.id}/grade`;

  const goToGrade = () => router.push(gradeUrl);

  return (
    <li
      className="card-link"
      role="link"
      tabIndex={0}
      onClick={goToGrade}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToGrade();
        }
      }}
    >
      <span className="card-link-text">
        <span className="card-meta">{item.courseName}</span>
        <span className="card-title">
          {item.name}
          <a
            href={item.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="card-title-external-link"
            title="Abrir atividade no Canvas LMS"
            aria-label="Abrir atividade no Canvas LMS"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={13} strokeWidth={1.8} />
          </a>
        </span>
      </span>
      <span className="pending-badge has-pending">{item.needsGradingCount}</span>
    </li>
  );
}

// Only ungraded activity shows here (the API already filters to
// needs_grading_count > 0, see derivePendingGradingItems in lib/dashboard.js)
// — as soon as a submission's corrected, it drops off this list on the next
// refresh instead of lingering as a stale "already handled" entry.
export default function PendingGradingList({ items, loading }) {
  return (
    <section className="dashboard-card">
      <h3>Correções pendentes</h3>
      {loading ? (
        <p className="lede">Carregando…</p>
      ) : !items || items.length === 0 ? (
        <p className="lede">Nenhuma atividade aguardando correção.</p>
      ) : (
        <ul className="card-list">
          {items.map((item) => (
            <PendingGradingItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
