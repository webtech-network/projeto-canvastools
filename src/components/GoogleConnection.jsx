'use client';

import { useEffect, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { getGoogleConnection, saveGoogleConnection, clearGoogleConnection } from '@/lib/googleConnection';
import { resetSyncStatus } from '@/lib/sync/syncStatusStore';

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Mirrors GithubConnection.jsx's connect/disconnect handoff exactly (see
// that file's own comment) — the durable record lives in IndexedDB, not the
// server session; this only redeems the one-time ?google=connected handoff.
// The push/pull sync actions that used to live here moved to the unified
// "Salvar/Carregar Configurações do CanvasTools" section at the top of
// /perfil (SettingsSaveLoad.jsx) — this component is connection-management
// only now, same scope as GithubConnection.jsx.
export default function GoogleConnection() {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const googleParam = params.get('google');

      if (googleParam === 'connected') {
        try {
          const response = await fetch('/api/google/pending-connection');
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Falha ao concluir a conexão com o Google.');
          if (data.connection) {
            await saveGoogleConnection(data.connection);
          }
        } catch (err) {
          if (!cancelled) setError(err.message);
        } finally {
          window.history.replaceState({}, '', window.location.pathname + '?tab=plataformas');
        }
      } else if (googleParam === 'erro') {
        setError('Falha ao conectar com o Google. Tente novamente.');
        window.history.replaceState({}, '', window.location.pathname + '?tab=plataformas');
      }

      const existing = await getGoogleConnection();
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
      await fetch('/api/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: connection.accessToken }),
      });
    } catch {
      // best-effort revocation — local disconnect proceeds regardless
    } finally {
      await clearGoogleConnection();
      resetSyncStatus();
      setConnection(null);
      setDisconnecting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="google-connection">
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {connection ? (
        <div className="github-connection-status">
          {connection.photoLink && (
            // eslint-disable-next-line @next/next/no-img-element -- external Google-hosted avatar, not a local asset
            <img src={connection.photoLink} alt="" className="github-avatar" width={40} height={40} />
          )}
          <div>
            <span className="card-title">{connection.name || connection.email}</span>
            <span className="card-meta">
              {connection.email} — <CircleCheck size={14} strokeWidth={2} className="inline-icon" /> Conectado
              {connection.lastSuccessfulSyncAt &&
                ` — última sincronização: ${formatDateTime(connection.lastSuccessfulSyncAt)}`}
            </span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" disabled={disconnecting} onClick={handleDisconnect}>
            {disconnecting ? 'Desconectando…' : 'Desconectar'}
          </button>
        </div>
      ) : (
        <>
          <p className="lede">
            Conecte sua conta do Google para guardar uma cópia das suas preferências (atalhos, prompts e modelos de
            IA) em uma área privada do seu Google Drive e recuperá-las em outro computador.
          </p>
          <a href="/api/google/auth/login" className="btn btn-primary">
            Conectar com Google
          </a>
        </>
      )}
    </div>
  );
}
