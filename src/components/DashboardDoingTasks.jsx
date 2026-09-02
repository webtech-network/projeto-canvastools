'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flag, Zap, ArrowRight } from 'lucide-react';
import { listTasks } from '@/lib/tasks/tasksRepo';
import { listProjects } from '@/lib/tasks/projectsRepo';

// Same "pure IndexedDB read, never gated on DashboardPanel's Canvas fetch"
// pattern as DashboardShortcuts.jsx's useShortcuts() — tasks/projects live
// entirely client-side (see TasksProvider.jsx), so there's nothing to
// stale-while-revalidate against a network cache for.
export default function DashboardDoingTasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [allTasks, allProjects] = await Promise.all([listTasks(), listProjects()]);
      if (cancelled) return;
      setTasks(allTasks.filter((t) => !t.deletedAt && t.status === 'DOING'));
      setProjects(allProjects.filter((p) => !p.deletedAt));
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="dashboard-card">
      <div className="dashboard-card-header">
        <h3>Tarefas em andamento</h3>
        <Link href="/tarefas" className="btn btn-ghost btn-sm" title="Painel de tarefas" aria-label="Painel de tarefas">
          <ArrowRight size={14} strokeWidth={1.8} />
          <span className="dashboard-card-header-btn-text">Painel</span>
        </Link>
      </div>

      {loading ? (
        <p className="lede">Carregando…</p>
      ) : tasks.length === 0 ? (
        <p className="lede">
          Nenhuma tarefa em <em>doing</em> no momento. Organize suas tarefas em <Link href="/tarefas">/tarefas</Link>.
        </p>
      ) : (
        <ul className="card-list">
          {tasks.map((task) => {
            const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
            return (
              <li key={task.id}>
                <Link href="/tarefas" className="card-link">
                  <span className="card-link-text">
                    <span className="card-meta">{project ? project.name : 'Sem projeto'}</span>
                    <span className="card-title">{task.title}</span>
                  </span>
                  {(task.priority?.important || task.priority?.urgent) && (
                    <span className="kanban-card-classification">
                      {task.priority?.important && (
                        <span className="kanban-card-flag" title="Importante">
                          <Flag size={13} strokeWidth={1.8} />
                        </span>
                      )}
                      {task.priority?.urgent && (
                        <span className="kanban-card-urgent" title="Urgente">
                          <Zap size={13} strokeWidth={1.8} />
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
