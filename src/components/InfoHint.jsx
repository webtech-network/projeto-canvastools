'use client';

import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

// Reusable "sobre esta tela" hint — an info icon aligned to the right of a
// page's <h1> (see .page-title-row in globals.css), replacing the old
// always-visible <p className="lede"> intro paragraph on the screens listed
// in that CSS comment. `children` is server-renderable JSX (plain text,
// icons, an .icon-legend list) passed straight through from each page's own
// Server Component — this component only owns the open/close interaction,
// same click-outside/Escape popover pattern already used by
// SyncStatusIndicator.jsx and UserMenu.jsx.
export default function InfoHint({ label = 'Sobre esta tela', children }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

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

  return (
    <div className="info-hint" ref={containerRef}>
      <button
        type="button"
        className="info-hint-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={label}
        aria-label={label}
      >
        <Info size={18} strokeWidth={1.8} />
      </button>
      {open && (
        <div className="info-hint-popover" role="dialog" aria-label={label}>
          {children}
        </div>
      )}
    </div>
  );
}
