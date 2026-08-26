'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import Modal from './Modal';

// Same plain-text-from-HTML approach as AssignmentsTable.jsx's own
// descriptionToPlainText — this app has zero HTML-sanitization tooling, and
// a text-entry submission's `body` is student-authored HTML, so it's never
// injected via dangerouslySetInnerHTML.
function plainTextFromHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks = doc.body.children.length > 0 ? Array.from(doc.body.children) : [doc.body];
  return blocks
    .map((el) => el.textContent.trim())
    .filter(Boolean)
    .join('\n\n');
}

// Only content types a browser natively renders inline in an <iframe> —
// everything else (docx/pptx/xlsx, zip, etc.) just triggers a download or
// shows blank there, so those get a more honest hint pointing at "abrir em
// janela própria" instead of pretending the embedded view will work.
function isLikelyIframeFriendly(contentType) {
  if (!contentType) return false;
  return contentType.startsWith('image/') || contentType === 'application/pdf' || contentType === 'text/plain';
}

// Picks its content source from `submissionType` instead of always routing
// through Canvas's own `preview_url` — confirmed in real use, Canvas
// frequently refuses to be framed there at all (X-Frame-Options), for
// uploaded files just as much as for the submission page itself:
//   - online_text_entry: `body` is already sitting right here in the
//     Submission payload — shown as plain text, no network/iframe involved.
//   - online_url: the student's own link is an ordinary external page with
//     none of Canvas's auth/framing baggage.
//   - online_upload: each attachment's own `url` is a direct(ish) file
//     link, separate from Canvas's blocked preview wrapper page.
//   - anything else (media_recording, on_paper, basic_lti_launch, ...):
//     falls back to Canvas's preview_url — best effort, may still be
//     blocked, "Abrir em janela própria" is the guaranteed-to-work escape
//     hatch either way.
export default function SubmissionViewerModal({
  studentName,
  previewUrl,
  submissionType,
  submittedUrl,
  body,
  attachments = [],
  onClose,
}) {
  const hasAttachments = submissionType === 'online_upload' && attachments.length > 0;
  const [selectedAttachmentId, setSelectedAttachmentId] = useState(() => attachments[0]?.id ?? null);
  const selectedAttachment = hasAttachments
    ? attachments.find((a) => a.id === selectedAttachmentId) || attachments[0]
    : null;

  const isTextEntry = submissionType === 'online_text_entry' && Boolean(body);
  const isDirectLink = submissionType === 'online_url' && Boolean(submittedUrl);

  const viewUrl = hasAttachments ? selectedAttachment?.url : isDirectLink ? submittedUrl : previewUrl;

  function openInWindow() {
    // A real popup window (not just a background tab) — closest match to
    // "lançar em uma janela independente" from a plain <a target="_blank">.
    window.open(viewUrl, `submissao-${encodeURIComponent(studentName)}`, 'noopener,noreferrer,width=1100,height=850');
  }

  let hint = null;
  if (hasAttachments) {
    hint = isLikelyIframeFriendly(selectedAttachment?.contentType)
      ? 'Arquivo enviado pelo aluno.'
      : 'Este tipo de arquivo pode não ser exibido aqui — use "Abrir em janela própria" para baixar ou visualizar.';
  } else if (isDirectLink) {
    hint = 'Link enviado pelo aluno — pode não carregar aqui se o site não permitir ser exibido em outra página.';
  } else if (!isTextEntry) {
    hint =
      'Carregado direto do Canvas — exige que você esteja autenticado lá neste navegador, e o Canvas pode recusar ser exibido aqui. Se não carregar, abra em uma janela própria.';
  }

  return (
    // preventBackdropClose: this modal exists purely to look at something,
    // with no unsaved state to protect — but an iframe eats a click meant
    // for the backdrop just as readily as one meant for its own content, so
    // an accidental click near its edge closing the whole modal was
    // surprising in practice. Closing is deliberately limited to the
    // header's own X button (also disables Escape-to-close, same as any
    // other preventBackdropClose caller).
    <Modal title={`Entrega de ${studentName}`} onClose={onClose} size="lg" fullBleed preventBackdropClose>
      <div className="submission-viewer">
        <div className="submission-viewer-toolbar">
          <div className="submission-viewer-toolbar-info">
            {hint && <p className="submission-viewer-hint">{hint}</p>}
            {hasAttachments && attachments.length > 1 && (
              <div className="submission-viewer-attachments" role="group" aria-label="Escolher arquivo">
                {attachments.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`segmented-btn${a.id === selectedAttachmentId ? ' active' : ''}`}
                    onClick={() => setSelectedAttachmentId(a.id)}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!isTextEntry && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={openInWindow}>
              <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
              Abrir em janela própria
            </button>
          )}
        </div>
        {isTextEntry ? (
          <div className="submission-viewer-text">
            <p className="message-detail-text">{plainTextFromHtml(body)}</p>
          </div>
        ) : (
          <iframe src={viewUrl} title={`Entrega de ${studentName}`} className="submission-viewer-iframe" />
        )}
      </div>
    </Modal>
  );
}
