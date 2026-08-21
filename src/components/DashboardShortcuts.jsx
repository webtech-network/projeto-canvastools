'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { useShortcuts } from '@/lib/shortcuts';
import { getShortcutIcon } from '@/lib/shortcutIcons';

// Never gated on the dashboard's network fetch — shortcuts are a pure
// IndexedDB read, so this renders independently of DashboardPanel's
// stale-while-revalidate cycle.
export default function DashboardShortcuts() {
  const { shortcuts, loading } = useShortcuts();

  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>Atalhos</h3>
        <Link href="/perfil?tab=atalhos" className="btn btn-ghost btn-sm">
          <Pencil size={14} strokeWidth={1.8} />
          Editar atalhos
        </Link>
      </div>

      {loading ? (
        <p className="lede">Carregando…</p>
      ) : shortcuts.length === 0 ? (
        <p className="lede">
          Nenhum atalho configurado ainda. Adicione em <Link href="/perfil?tab=atalhos">seu perfil</Link>.
        </p>
      ) : (
        <div className="shortcuts-grid shortcuts-grid--condensed">
          {shortcuts.map((s) => {
            const Icon = getShortcutIcon(s.icon);
            return (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card-link card-link--condensed"
                title={s.label}
              >
                <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                <span className="card-title">{s.label}</span>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
