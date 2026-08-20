'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { CloudCheck, Cloud, CloudAlert, WifiOff, LoaderCircle, Download } from 'lucide-react';
import {
  subscribeSyncStatus,
  getSyncStatusSnapshot,
  getServerSyncStatusSnapshot,
  setWorkspaceSyncState,
  setSettingsSyncState,
} from '@/lib/sync/syncStatusStore';
import { getGoogleConnection } from '@/lib/googleConnection';
import { flushWorkspaceSyncNow } from '@/lib/sync/workspaceSyncScheduler';
import { pullWorkspaceFromGoogleDrive } from '@/lib/workspace/workspaceDriveSync';

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Highest-priority state across both domains wins the combined badge — an
// error/reauth on either domain must be impossible to miss, while "synced"
// only wins when nothing more urgent is going on in either one.
const PRIORITY = ['reauth-required', 'error', 'offline', 'syncing', 'pending', 'not-connected', 'synced'];

function pickCombinedState(workspaceState, settingsState) {
  for (const state of PRIORITY) {
    if (workspaceState === state || settingsState === state) return state;
  }
  return 'synced';
}

const BADGE = {
  'reauth-required': { Icon: CloudAlert, color: 'var(--err)', label: 'Reconectar' },
  error: { Icon: CloudAlert, color: 'var(--err)', label: 'Erro' },
  offline: { Icon: WifiOff, color: 'var(--ink-soft)', label: 'Offline' },
  syncing: { Icon: LoaderCircle, color: 'var(--accent)', label: 'Sincronizando…' },
  pending: { Icon: Cloud, color: 'var(--ink-soft)', label: 'Pendente' },
  'not-connected': { Icon: Cloud, color: 'var(--ink-soft)', label: 'Conectar' },
  synced: { Icon: CloudCheck, color: 'var(--ink)', label: 'Sincronizado' },
};

const DOMAIN_LABELS = {
  'reauth-required': 'reconexão necessária',
  error: 'erro ao sincronizar',
  offline: 'offline, aguardando conexão',
  syncing: 'sincronizando…',
  pending: 'alterações pendentes',
  'not-connected': 'Google não conectado',
  synced: 'sincronizado',
};

function domainLine(label, domain) {
  let detail;
  if (domain.state === 'synced') {
    detail = domain.lastSyncAt ? `sincronizado — ${formatDateTime(domain.lastSyncAt)}` : 'conectado, nada sincronizado ainda';
  } else {
    detail = DOMAIN_LABELS[domain.state];
  }
  return `${label}: ${detail}`;
}

// Always-visible trust indicator (spec: give the user clarity about sync
// state so they trust the app). Reads syncStatusStore.js via
// useSyncExternalStore — a plain module singleton, not React Context, so it
// stays correct regardless of which dashboard route is currently mounted
// (workspaceSyncScheduler.js keeps running after /tarefas unmounts).
export default function SyncStatusIndicator() {
  const { workspace, settings } = useSyncExternalStore(
    subscribeSyncStatus,
    getSyncStatusSnapshot,
    getServerSyncStatusSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullError, setPullError] = useState(null);
  const containerRef = useRef(null);

  // Seeds both slices from the real IndexedDB connection on mount — without
  // this, an already-connected, already-synced user would see
  // "not-connected" until their next task edit or manual settings sync.
  useEffect(() => {
    (async () => {
      const connection = await getGoogleConnection();
      if (!connection) {
        setWorkspaceSyncState({ state: 'not-connected' });
        setSettingsSyncState({ state: 'not-connected' });
        return;
      }
      // 'synced' (not 'not-connected') as soon as a connection exists at
      // all, even with no lastSyncAt yet — the connection being present is
      // what matters for "should this look alarming or not"; a domain that
      // simply hasn't pushed anything yet is a harmless resting state, not
      // an invitation to reconnect.
      setWorkspaceSyncState({
        state: 'synced',
        lastSyncAt: connection.workspaceLastSuccessfulSyncAt || null,
      });
      setSettingsSyncState({
        state: 'synced',
        lastSyncAt: connection.lastSuccessfulSyncAt || null,
      });
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function handlePull() {
    if (!window.confirm('Baixar as tarefas do Google Drive substitui as tarefas e projetos deste dispositivo. Continuar?')) {
      return;
    }
    setPulling(true);
    setPullError(null);
    try {
      await pullWorkspaceFromGoogleDrive();
      window.location.reload();
    } catch (err) {
      setPullError(err.message);
      setPulling(false);
    }
  }

  const combined = pickCombinedState(workspace.state, settings.state);
  const { Icon, color, label } = BADGE[combined];

  return (
    <div className="sync-status" ref={containerRef}>
      <button
        type="button"
        className="sync-status-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Estado da sincronização"
      >
        <Icon size={18} strokeWidth={1.8} className={combined === 'syncing' ? 'sync-spin' : ''} style={{ color }} />
        <span className="sync-status-label">{label}</span>
      </button>

      {open && (
        <div className="sync-status-popover" role="menu">
          <p className="sync-status-line">{domainLine('Tarefas', workspace)}</p>
          <p className="sync-status-line">{domainLine('Configurações', settings)}</p>

          {pullError && (
            <p className="alert alert-error" role="alert">
              {pullError}
            </p>
          )}

          <div className="sync-status-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => flushWorkspaceSyncNow()}>
              Sincronizar tarefas agora
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={pulling} onClick={handlePull}>
              <Download size={14} strokeWidth={1.8} />
              {pulling ? 'Baixando…' : 'Baixar tarefas do Drive'}
            </button>
          </div>

          <Link href="/perfil" className="sync-status-link" role="menuitem" onClick={() => setOpen(false)}>
            Gerenciar em Configurações
          </Link>
        </div>
      )}
    </div>
  );
}
