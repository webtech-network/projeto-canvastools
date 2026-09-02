'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { CloudCheck, Cloud, CloudAlert, WifiOff, LoaderCircle } from 'lucide-react';
import {
  subscribeSyncStatus,
  getSyncStatusSnapshot,
  getServerSyncStatusSnapshot,
  setTasksSyncState,
  setSettingsSyncState,
  setWorkspacesSyncState,
} from '@/lib/sync/syncStatusStore';
import { getGoogleConnection } from '@/lib/googleConnection';
import { flushTasksSyncNow } from '@/lib/sync/tasksSyncScheduler';
import { flushWorkspacesSyncNow } from '@/lib/sync/workspacesSyncScheduler';

function formatDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Highest-priority state across all three domains wins the combined badge —
// an error/reauth on any domain must be impossible to miss, while "synced"
// only wins when nothing more urgent is going on in any of them.
const PRIORITY = ['reauth-required', 'error', 'offline', 'syncing', 'pending', 'not-connected', 'synced'];

function pickCombinedState(tasksState, settingsState, workspacesState) {
  for (const state of PRIORITY) {
    if (tasksState === state || settingsState === state || workspacesState === state) return state;
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
// (tasksSyncScheduler.js/workspacesSyncScheduler.js keep running after their
// respective providers unmount).
export default function SyncStatusIndicator() {
  const { tasks, settings, workspaces } = useSyncExternalStore(
    subscribeSyncStatus,
    getSyncStatusSnapshot,
    getServerSyncStatusSnapshot,
  );
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Seeds all three slices from the real IndexedDB connection on mount —
  // without this, an already-connected, already-synced user would see
  // "not-connected" until their next edit or manual sync.
  useEffect(() => {
    (async () => {
      const connection = await getGoogleConnection();
      if (!connection) {
        setTasksSyncState({ state: 'not-connected' });
        setSettingsSyncState({ state: 'not-connected' });
        setWorkspacesSyncState({ state: 'not-connected' });
        return;
      }
      // 'synced' (not 'not-connected') as soon as a connection exists at
      // all, even with no lastSyncAt yet — the connection being present is
      // what matters for "should this look alarming or not"; a domain that
      // simply hasn't pushed anything yet is a harmless resting state, not
      // an invitation to reconnect.
      setTasksSyncState({
        state: 'synced',
        lastSyncAt: connection.tasksLastSuccessfulSyncAt || null,
      });
      setSettingsSyncState({
        state: 'synced',
        lastSyncAt: connection.lastSuccessfulSyncAt || null,
      });
      setWorkspacesSyncState({
        state: 'synced',
        lastSyncAt: connection.workspacesLastSuccessfulSyncAt || null,
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

  const combined = pickCombinedState(tasks.state, settings.state, workspaces.state);
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
          <p className="sync-status-line">{domainLine('Tarefas', tasks)}</p>
          <p className="sync-status-line">{domainLine('Workspaces', workspaces)}</p>
          <p className="sync-status-line">{domainLine('Configurações', settings)}</p>

          <div className="sync-status-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => flushTasksSyncNow()}>
              Sincronizar tarefas agora
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => flushWorkspacesSyncNow()}>
              Sincronizar workspaces agora
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
