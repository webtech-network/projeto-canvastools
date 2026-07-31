// Shows what a page is scoped to (course, activity, etc.) as a labeled box
// below the page's own <h1> — used instead of folding that context into the
// title itself, so the h1 stays a short, stable page name.
export default function ContextBanner({ items }) {
  return (
    <div className="context-banner">
      {items.map(({ label, value }) => (
        <div key={label} className="context-banner-item">
          <span className="context-banner-label">{label}</span>
          <span className="context-banner-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
