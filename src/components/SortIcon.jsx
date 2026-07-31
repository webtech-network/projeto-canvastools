import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// Shared by any sortable `data-table` header (CourseBrowser, MessageList) —
// a neutral up/down pair when unsorted, a single chevron pointing the active
// sort direction once a column is picked.
export default function SortIcon({ direction }) {
  const Icon = direction === 'desc' ? ChevronDown : direction === 'asc' ? ChevronUp : ChevronsUpDown;

  return (
    <Icon
      className={`sort-icon${direction ? ' active' : ''}`}
      size={14}
      strokeWidth={2}
      aria-hidden="true"
    />
  );
}
