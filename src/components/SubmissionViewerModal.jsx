'use client';

import { ExternalLink, FileText, Link2 } from 'lucide-react';
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
//   - online_upload / online_url: neither is reliably embeddable, so neither
//     attempts an iframe at all — CONFIRMED in real use for both. Uploaded
//     files are still Canvas-hosted links, hitting the same X-Frame-Options
//     wall as `preview_url`; a submitted link is a page the *student* chose,
//     on a site whose own framing policy this app has no control over (many
//     sites — Google Docs, GitHub, YouTube, etc. — block being framed the
//     same way). Both cases just list the real URL/filename Canvas reports
//     and a direct "abrir em janela própria" action instead — the one
//     mechanism that reliably works regardless of what the target allows,
//     since X-Frame-Options only restricts framing, not top-level
//     navigation.
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
  const isTextEntry = submissionType === 'online_text_entry' && Boolean(body);
  const isFileUpload = submissionType === 'online_upload' && attachments.length > 0;
  const isDirectLink = submissionType === 'online_url' && Boolean(submittedUrl);
  const isLinkList = isFileUpload || isDirectLink;

  const linkListMessage = isFileUpload
    ? 'O Canvas não permite abrir arquivos enviados dentro do CanvasTools — abra cada um em uma janela própria:'
    : 'Muitos sites não permitem ser exibidos dentro de outra página — abra o link enviado pelo aluno em uma janela própria:';
  const linkListItems = isFileUpload
    ? attachments.map((a) => ({ key: a.id, Icon: FileText, label: a.name, url: a.url }))
    : isDirectLink
      ? [{ key: 'url', Icon: Link2, label: submittedUrl, url: submittedUrl }]
      : [];

  // Only this remaining case (no better alternative — media_recording,
  // on_paper, basic_lti_launch, etc. have no discrete file/URL to point to
  // instead) still attempts an iframe.
  const iframeUrl = !isTextEntry && !isLinkList ? previewUrl : null;

  return (
    // closeOnBackdropClick={false}: an iframe eats a click meant for the
    // backdrop just as readily as one meant for its own content, so an
    // accidental click near its edge closing the whole modal was surprising
    // in practice. Escape still works (unlike preventBackdropClose, which
    // would block that too) — only the backdrop click and the header's own
    // X button are the deliberate close paths here.
    <Modal title={`Entrega de ${studentName}`} onClose={onClose} size="lg" fullBleed closeOnBackdropClick={false}>
      <div className="submission-viewer">
        {iframeUrl && (
          <div className="submission-viewer-toolbar">
            <p className="submission-viewer-hint">
              Carregado direto do Canvas — exige que você esteja autenticado lá neste navegador, e o Canvas pode
              recusar ser exibido aqui. Se não carregar, abra em uma janela própria.
            </p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openInWindow(iframeUrl, studentName)}>
              <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
              Abrir em janela própria
            </button>
          </div>
        )}
        {isLinkList ? (
          <div className="submission-viewer-files">
            <p className="submission-viewer-hint">{linkListMessage}</p>
            <ul className="submission-viewer-file-list">
              {linkListItems.map(({ key, Icon, label, url }) => (
                <li key={key}>
                  <button
                    type="button"
                    className="btn btn-secondary submission-viewer-file-btn"
                    onClick={() => openInWindow(url, studentName)}
                    title={label}
                  >
                    <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                    <span className="submission-viewer-file-name">{label}</span>
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
