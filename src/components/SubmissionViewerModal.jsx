'use client';

import { ExternalLink } from 'lucide-react';
import Modal from './Modal';

// `previewUrl` is Canvas's own Submission.preview_url — the same URL
// SpeedGrader itself iframes internally to show a submission's content
// (works for online_text_entry/online_url/online_upload/etc. alike, Canvas
// renders whatever's appropriate). Per Canvas's own API docs it "requires
// the user to log in" — this works as long as the professor's browser
// already carries an active Canvas session, which is normally the case here
// since this app's own Canvas OAuth login happens in that same browser.
// Canvas could still refuse to be framed on a given instance
// (X-Frame-Options/CSP) — a blocked iframe just renders blank, with no JS
// error this app could catch and react to — so the "Abrir em janela
// própria" escape hatch stays visible unconditionally, not just after a
// detected failure.
export default function SubmissionViewerModal({ studentName, previewUrl, onClose }) {
  function openInWindow() {
    // A real popup window (not just a background tab) — closest match to
    // "lançar em uma janela independente" from a plain <a target="_blank">.
    window.open(previewUrl, `submissao-${encodeURIComponent(studentName)}`, 'noopener,noreferrer,width=1100,height=850');
  }

  return (
    <Modal title={`Entrega de ${studentName}`} onClose={onClose} size="lg" fullBleed>
      <div className="submission-viewer">
        <div className="submission-viewer-toolbar">
          <p className="submission-viewer-hint">
            Carregado direto do Canvas — exige que você esteja autenticado lá neste navegador. Se não carregar aqui,
            abra em uma janela própria.
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={openInWindow}>
            <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
            Abrir em janela própria
          </button>
        </div>
        <iframe src={previewUrl} title={`Entrega de ${studentName}`} className="submission-viewer-iframe" />
      </div>
    </Modal>
  );
}
