'use client';

import { ExternalLink, FileText } from 'lucide-react';
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

function openInWindow(url, name) {
  // A real popup window (not just a background tab) — closest match to
  // "lançar em uma janela independente" from a plain <a target="_blank">.
  window.open(url, `submissao-${encodeURIComponent(name)}`, 'noopener,noreferrer,width=1100,height=850');
}

// Picks its content source from `submissionType` instead of always routing
// through Canvas's own `preview_url`:
//   - online_text_entry: `body` is already sitting right here in the
//     Submission payload — shown as plain text, no network/iframe involved.
//   - online_url: the student's own link is an ordinary external page —
//     genuinely a different origin than Canvas, so it's worth iframing.
//   - online_upload: each attachment's own `url` is still a Canvas-hosted
//     link (not a truly external one), so — CONFIRMED in real use — it hits
//     the exact same X-Frame-Options wall as `preview_url` does when
//     iframed, even though it loads fine as a top-level navigation/popup.
//     Iframing it was never going to work, so this case skips the iframe
//     entirely and goes straight to a list of "abrir arquivo" actions.
//   - anything else (media_recording, on_paper, basic_lti_launch, ...):
//     falls back to Canvas's preview_url — the only option left, iframing
//     it is best-effort (same X-Frame-Options risk as above), "Abrir em
//     janela própria" is the guaranteed-to-work escape hatch either way.
export default function SubmissionViewerModal({
  studentName,
  previewUrl,
  submissionType,
  submittedUrl,
  body,
  attachments = [],
  onClose,
}) {
  const isFileUpload = submissionType === 'online_upload' && attachments.length > 0;
  const isTextEntry = submissionType === 'online_text_entry' && Boolean(body);
  const isDirectLink = submissionType === 'online_url' && Boolean(submittedUrl);
  // Only these two cases actually attempt an iframe — see the file-level
  // comment above for why file uploads don't.
  const iframeUrl = isDirectLink ? submittedUrl : !isTextEntry && !isFileUpload ? previewUrl : null;

  let hint = null;
  if (isDirectLink) {
    hint = 'Link enviado pelo aluno — pode não carregar aqui se o site não permitir ser exibido em outra página.';
  } else if (iframeUrl) {
    hint =
      'Carregado direto do Canvas — exige que você esteja autenticado lá neste navegador, e o Canvas pode recusar ser exibido aqui. Se não carregar, abra em uma janela própria.';
  }

  return (
    // closeOnBackdropClick={false}: an iframe eats a click meant for the
    // backdrop just as readily as one meant for its own content, so an
    // accidental click near its edge closing the whole modal was surprising
    // in practice. Escape still works (unlike preventBackdropClose, which
    // would block that too) — only the backdrop click and the header's own
    // X button are the deliberate close paths here.
    <Modal title={`Entrega de ${studentName}`} onClose={onClose} size="lg" fullBleed closeOnBackdropClick={false}>
      <div className="submission-viewer">
        {!isFileUpload && (
          <div className="submission-viewer-toolbar">
            {hint && <p className="submission-viewer-hint">{hint}</p>}
            {!isTextEntry && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => openInWindow(iframeUrl, studentName)}>
                <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
                Abrir em janela própria
              </button>
            )}
          </div>
        )}
        {isFileUpload ? (
          <div className="submission-viewer-files">
            <p className="submission-viewer-hint">
              {/* Canvas hosts uploaded files behind the same login/framing wall as its
                  preview page — confirmed not embeddable here, so each file just gets
                  its own direct "abrir" action instead of a doomed iframe attempt. */}
              O Canvas não permite abrir arquivos enviados dentro do CanvasTools — abra cada um em uma janela própria:
            </p>
            <ul className="submission-viewer-file-list">
              {attachments.map((a) => (
                <li key={a.id}>
                  <button type="button" className="btn btn-secondary submission-viewer-file-btn" onClick={() => openInWindow(a.url, a.name)}>
                    <FileText size={16} strokeWidth={1.8} aria-hidden="true" />
                    <span className="submission-viewer-file-name">{a.name}</span>
                    <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : isTextEntry ? (
          <div className="submission-viewer-text">
            <p className="message-detail-text">{plainTextFromHtml(body)}</p>
          </div>
        ) : (
          <iframe src={iframeUrl} title={`Entrega de ${studentName}`} className="submission-viewer-iframe" />
        )}
      </div>
    </Modal>
  );
}
