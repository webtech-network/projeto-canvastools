import { ExternalLink } from 'lucide-react';

// Shows what a page is scoped to (course, activity, etc.) as a labeled box
// below the page's own <h1> — used instead of folding that context into the
// title itself, so the h1 stays a short, stable page name. An item can
// optionally carry a `link` ({ href, title }) — rendered as the same
// external-link-icon pattern AssignmentsTable.jsx already uses for "Abrir
// atividade no Canvas" — for a quick jump straight to that context in
// Canvas (e.g. the grade page's SpeedGrader link right after the activity
// name).
export default function ContextBanner({ items }) {
  return (
    <div className="context-banner">
      {items.map(({ label, value, link }) => (
        <div key={label} className="context-banner-item">
          <span className="context-banner-label">{label}</span>
          <span className="context-banner-value">
            {value}
            {link && (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="external-link-icon"
                title={link.title}
                aria-label={link.title}
              >
                <ExternalLink size={14} strokeWidth={1.8} />
              </a>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
