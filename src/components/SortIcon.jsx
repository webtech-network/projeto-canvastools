// Shared by any sortable `data-table` header (CourseBrowser, MessageList) —
// a plain up/down chevron pair when unsorted, a single chevron pointing the
// active sort direction once a column is picked.
export default function SortIcon({ direction }) {
  return (
    <svg
      className={`sort-icon${direction ? ` active` : ''}`}
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === 'desc' ? (
        <path d="M6 9l6 6 6-6" />
      ) : direction === 'asc' ? (
        <path d="M6 15l6-6 6 6" />
      ) : (
        <>
          <path d="M6 9l6-6 6 6" />
          <path d="M6 15l6 6 6-6" />
        </>
      )}
    </svg>
  );
}
