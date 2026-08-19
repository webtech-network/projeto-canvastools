'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

// `preventBackdropClose` — for a modal holding in-progress, unsaved text
// (e.g. MessageList.jsx's AI reply box once something's been typed), an
// accidental outside click or Escape press shouldn't silently discard it —
// only the explicit close button should. Off by default, so every other
// caller (SettingsSaveLoad.jsx) keeps the usual click-outside/Escape-to-close
// behavior.
export default function Modal({ title, onClose, children, preventBackdropClose = false }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !preventBackdropClose) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, preventBackdropClose]);

  return (
    <div className="modal-backdrop" onClick={preventBackdropClose ? undefined : onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
