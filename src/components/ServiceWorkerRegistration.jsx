'use client';

import { useEffect } from 'react';
import { scheduleWorkspaceSync } from '@/lib/sync/workspaceSyncScheduler';

// No visible UI — registers public/sw.js (offline shell cache, see that
// file's own comment for why it never does the actual Drive sync itself)
// and wires its best-effort retry message back into the real sync engine.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // best-effort — offline resilience is a nicety, not a dependency
    });

    function onMessage(event) {
      if (event.data === 'retry-workspace-sync') scheduleWorkspaceSync();
    }
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  return null;
}
