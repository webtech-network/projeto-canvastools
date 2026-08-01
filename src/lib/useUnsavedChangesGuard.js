'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_MESSAGE = 'Existem alterações não salvas nesta página. Deseja realmente sair?';

// Warns before leaving a page with unsaved changes, covering both ways a
// user can actually leave:
//   1. Real browser-level exits (refresh, tab close, typing a new URL,
//      back/forward) — the standard `beforeunload` event.
//   2. In-app navigation (clicking a <Link>/<a> to another page) — the App
//      Router has no built-in navigation-guard hook for this, so clicks are
//      intercepted at the document level in the CAPTURE phase, which runs
//      before Next's own Link click handler (attached directly on the
//      anchor, bubble phase) gets a chance to navigate.
export function useUnsavedChangesGuard(isDirty, message = DEFAULT_MESSAGE) {
  const router = useRouter();

  useEffect(() => {
    function handleBeforeUnload(e) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    function handleClick(e) {
      if (!isDirty || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const anchor = e.target.closest?.('a[href]');
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href)) return; // external/mailto/tel/etc.

      e.preventDefault();
      e.stopPropagation();
      if (window.confirm(message)) {
        router.push(href);
      }
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty, message, router]);
}
