'use client';

import { useEffect } from 'react';
import { scheduleWorkspaceSync } from '@/lib/sync/workspaceSyncScheduler';
import { capturePrompt, markInstalled } from '@/lib/pwaInstall';

// No visible UI — registers public/sw.js (offline shell cache, see that
// file's own comment for why it never does the actual Drive sync itself)
// and wires its best-effort retry message back into the real sync engine.
// Also the app's one place listening for the PWA install lifecycle
// (beforeinstallprompt/appinstalled), feeding pwaInstall.js's store that
// UserMenu.jsx's "Instalar app" item reads from.
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

  useEffect(() => {
    function onBeforeInstallPrompt(event) {
      // Suppresses Chrome's own mini-infobar — this app's own "Instalar
      // app" menu item is the intended trigger instead.
      event.preventDefault();
      capturePrompt(event);
    }
    function onAppInstalled() {
      markInstalled();
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  return null;
}
