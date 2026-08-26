'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

// `preventBackdropClose` — for a modal holding in-progress, unsaved text
// (e.g. MessageList.jsx's AI reply box once something's been typed), an
// accidental outside click or Escape press shouldn't silently discard it —
// only the explicit close button should. Blocks BOTH backdrop-click and
// Escape. Off by default, so every other caller (SettingsSaveLoad.jsx)
// keeps the usual click-outside/Escape-to-close behavior.
//
// `closeOnBackdropClick` (default true) — a narrower, independent knob for
// SubmissionViewerModal.jsx: that modal has no unsaved state to protect (so
// preventBackdropClose's blanket "block Escape too" isn't the right fit),
// but its content is an iframe/large clickable area where an accidental
// click near the edge closing the whole thing was surprising in practice.
// Set this to false to block only the backdrop click, leaving Escape (and
// the header's own X button) working normally.
//
// `size="lg"` / `fullBleed` — added for SubmissionViewerModal.jsx, the first
// caller that needs to host an iframe rather than a form: `.modal`'s default
// 560px/padded body is sized for text content, not a document preview.
// `fullBleed` drops modal-body's own padding so a child iframe can run edge
// to edge instead of floating inside a padded box.
export default function Modal({
  title,
  onClose,
  children,
  preventBackdropClose = false,
  closeOnBackdropClick = true,
  size,
  fullBleed = false,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !preventBackdropClose) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, preventBackdropClose]);

  const backdropClosable = closeOnBackdropClick && !preventBackdropClose;

  return (
    <div className="modal-backdrop" onClick={backdropClosable ? onClose : undefined}>
      <div
        className={`modal${size ? ` modal--${size}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        <div className={`modal-body${fullBleed ? ' modal-body--full-bleed' : ''}`}>{children}</div>
      </div>
    </div>
  );
}
