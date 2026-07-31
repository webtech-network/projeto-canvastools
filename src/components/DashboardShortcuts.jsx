'use client';

import Link from 'next/link';
import { useShortcuts } from '@/lib/shortcuts';

// Never gated on the dashboard's network fetch — shortcuts are a pure
// IndexedDB read, so this renders independently of DashboardPanel's
// stale-while-revalidate cycle.
export default function DashboardShortcuts() {
  const { shortcuts, loading } = useShortcuts();

  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>Atalhos</h3>
        <Link href="/perfil" className="btn btn-ghost btn-sm">
          Editar atalhos
        </Link>
      </div>

      {loading ? (
        <p className="lede">Carregando…</p>
      ) : shortcuts.length === 0 ? (
        <p className="lede">
          Nenhum atalho configurado ainda. Adicione em <Link href="/perfil">seu perfil</Link>.
        </p>
      ) : (
        <div className="shortcuts-grid">
          {shortcuts.map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="card-link">
              <span className="card-title">{s.label}</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
