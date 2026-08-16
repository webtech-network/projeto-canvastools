'use client';

import { useEffect, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { getGithubConnection, saveGithubConnection, clearGithubConnection } from '@/lib/githubConnection';

// The durable connection record lives in IndexedDB (see
// src/lib/githubConnection.js), not the server session — on mount this
// checks for a one-time ?github=connected handoff (set by
// github/oauth2/callback after a successful OAuth round-trip), redeems it
// via /api/github/pending-connection, and persists the result locally.
export default function GithubConnection() {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const githubParam = params.get('github');

      if (githubParam === 'connected') {
        try {
          const response = await fetch('/api/github/pending-connection');
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Falha ao concluir a conexão com o GitHub.');
          if (data.connection) {
            await saveGithubConnection(data.connection);
          }
        } catch (err) {
          if (!cancelled) setError(err.message);
        } finally {
          window.history.replaceState({}, '', window.location.pathname + '?tab=plataformas');
        }
      } else if (githubParam === 'erro') {
        setError('Falha ao conectar com o GitHub. Tente novamente.');
        window.history.replaceState({}, '', window.location.pathname + '?tab=plataformas');
      }

      const existing = await getGithubConnection();
      if (!cancelled) {
        setConnection(existing);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDisconnect() {
    if (!connection) return;
    setDisconnecting(true);
    setError(null);
    try {
      await fetch('/api/github/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: connection.accessToken }),
      });
    } catch {
      // best-effort revocation — local disconnect proceeds regardless
    } finally {
      await clearGithubConnection();
      setConnection(null);
      setDisconnecting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="github-connection">
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {connection ? (
        <div className="github-connection-status">
          {/* eslint-disable-next-line @next/next/no-img-element -- external GitHub-hosted avatar, not a local asset */}
          <img src={connection.avatarUrl} alt="" className="github-avatar" width={40} height={40} />
          <div>
            <span className="card-title">{connection.name || connection.login}</span>
            <span className="card-meta">
              @{connection.login} — <CircleCheck size={14} strokeWidth={2} className="inline-icon" /> Conectado
            </span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" disabled={disconnecting} onClick={handleDisconnect}>
            {disconnecting ? 'Desconectando…' : 'Desconectar'}
          </button>
        </div>
      ) : (
        <>
          <p className="lede">
            Conecte sua conta do GitHub para, em breve, vincular cursos a repositórios (board, issues e conteúdo
            associados).
          </p>
          <a href="/api/github/auth/login" className="btn btn-primary">
            Conectar com GitHub
          </a>
        </>
      )}
    </div>
  );
}
