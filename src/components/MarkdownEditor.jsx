'use client';

import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Heading1, Heading2, Heading3, Heading4, List, ListOrdered, Quote, Code, Link2, Eye, FileCode } from 'lucide-react';
import { markdownToHtml, htmlToMarkdown } from '@/lib/markdown';

// ---- Raw-mode (textarea) actions --------------------------------------
// Wraps the current selection with `before`/`after` (or, with no selection,
// inserts both around the cursor and places it between them) — the standard
// GitHub-comment-box technique for a toolbar-driven plain-text Markdown
// editor.
function wrapSelection(textarea, before, after = before) {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const newValue = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
  return {
    newValue,
    selStart: selectionStart + before.length,
    selEnd: selectionStart + before.length + selected.length,
  };
}

// Prefixes every line touched by the current selection with `prefix` — used
// for headings/lists/quotes, which are line-level Markdown syntax rather
// than wrapped inline syntax.
function prefixLines(textarea, prefix) {
  const { selectionStart, selectionEnd, value } = textarea;
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  let lineEnd = value.indexOf('\n', selectionEnd);
  if (lineEnd === -1) lineEnd = value.length;
  const block = value.slice(lineStart, lineEnd);
  const prefixed = block
    .split('\n')
    .map((line) => prefix + line)
    .join('\n');
  const newValue = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
  return { newValue, selStart: lineStart, selEnd: lineStart + prefixed.length };
}

function linkUrl() {
  return window.prompt('URL do link:', 'https://');
}

// ---- Rich-mode (contentEditable) actions -------------------------------
// document.execCommand is deprecated but still the only zero-dependency way
// to drive basic contentEditable formatting in Chrome — same "raw platform
// API over a library" tradeoff as markdown.js's hand-rolled parser.
function wrapSelectionInTag(tagName) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  const el = document.createElement(tagName);
  el.appendChild(range.extractContents());
  range.insertNode(el);
  const newRange = document.createRange();
  newRange.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

const TOOLBAR_ACTIONS = [
  { id: 'bold', label: 'Negrito', Icon: Bold, applyRaw: (t) => wrapSelection(t, '**'), applyRich: () => document.execCommand('bold') },
  { id: 'italic', label: 'Itálico', Icon: Italic, applyRaw: (t) => wrapSelection(t, '_'), applyRich: () => document.execCommand('italic') },
  {
    id: 'heading1',
    label: 'Título 1',
    Icon: Heading1,
    applyRaw: (t) => prefixLines(t, '# '),
    applyRich: () => document.execCommand('formatBlock', false, 'H1'),
  },
  {
    id: 'heading2',
    label: 'Título 2',
    Icon: Heading2,
    applyRaw: (t) => prefixLines(t, '## '),
    applyRich: () => document.execCommand('formatBlock', false, 'H2'),
  },
  {
    id: 'heading3',
    label: 'Título 3',
    Icon: Heading3,
    applyRaw: (t) => prefixLines(t, '### '),
    applyRich: () => document.execCommand('formatBlock', false, 'H3'),
  },
  {
    id: 'heading4',
    label: 'Título 4',
    Icon: Heading4,
    applyRaw: (t) => prefixLines(t, '#### '),
    applyRich: () => document.execCommand('formatBlock', false, 'H4'),
  },
  { id: 'list', label: 'Lista', Icon: List, applyRaw: (t) => prefixLines(t, '- '), applyRich: () => document.execCommand('insertUnorderedList') },
  {
    id: 'ordered',
    label: 'Lista numerada',
    Icon: ListOrdered,
    applyRaw: (t) => prefixLines(t, '1. '),
    applyRich: () => document.execCommand('insertOrderedList'),
  },
  {
    id: 'quote',
    label: 'Citação',
    Icon: Quote,
    applyRaw: (t) => prefixLines(t, '> '),
    applyRich: () => document.execCommand('formatBlock', false, 'BLOCKQUOTE'),
  },
  { id: 'code', label: 'Código', Icon: Code, applyRaw: (t) => wrapSelection(t, '`'), applyRich: () => wrapSelectionInTag('code') },
  {
    id: 'link',
    label: 'Link',
    Icon: Link2,
    applyRaw: (t) => {
      const url = linkUrl();
      if (!url) return null;
      const { selectionStart, selectionEnd, value } = t;
      const selected = value.slice(selectionStart, selectionEnd) || 'texto do link';
      const before = `[${selected}](${url})`;
      const newValue = value.slice(0, selectionStart) + before + value.slice(selectionEnd);
      return { newValue, selStart: selectionStart, selEnd: selectionStart + before.length };
    },
    applyRich: () => {
      const url = linkUrl();
      if (url) document.execCommand('createLink', false, url);
    },
  },
];

// Toolbar-driven Markdown editor with two interchangeable editing surfaces
// over the same underlying Markdown source (`value`/`onChange`, both plain
// strings — no new npm dependency, same "raw platform APIs over a library"
// pattern as markdownToHtml/htmlToMarkdown):
//  - "rich" (default): a contentEditable div showing markdownToHtml(value),
//    edited directly (typing, or the same toolbar via execCommand) — every
//    input event converts the DOM back to Markdown via htmlToMarkdown and
//    calls onChange, so `value` is always the source of truth even while
//    editing visually.
//  - "raw": the underlying Markdown text itself, in a plain textarea, using
//    the pre-existing wrap/prefix toolbar actions.
// Switching modes re-renders the other surface from the current `value` —
// intentionally not round-trip-lossless byte-for-byte (rich mode flattens
// multi-line paragraphs the way markdownToHtml already does), but it is
// idempotent and uses the exact same vocabulary either direction.
export default function MarkdownEditor({ value, onChange, disabled }) {
  const textareaRef = useRef(null);
  const richRef = useRef(null);
  const [mode, setMode] = useState('rich');
  // Tracks what the rich DOM currently reflects, so the two effects below
  // can tell "value changed because we just typed it" (DOM already matches,
  // skip re-render — preserves cursor position) apart from "value changed
  // for an external reason" (raw-mode edit, or CourseNoteEditor's Drive
  // merge landing after mount — DOM is stale, must re-render).
  const domValueRef = useRef(null);

  // Always (re)populate on entering rich mode — the contentEditable node is
  // freshly mounted each time (it doesn't exist while `mode` is 'raw'), so
  // it never already contains the right content.
  useEffect(() => {
    if (mode !== 'rich' || !richRef.current) return;
    richRef.current.innerHTML = markdownToHtml(value) || '';
    domValueRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // While already in rich mode, re-sync only on a genuinely external value
  // change (see domValueRef comment above).
  useEffect(() => {
    if (mode !== 'rich' || !richRef.current || domValueRef.current === value) return;
    richRef.current.innerHTML = markdownToHtml(value) || '';
    domValueRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleRichInput() {
    const md = htmlToMarkdown(richRef.current);
    domValueRef.current = md;
    onChange(md);
  }

  function runAction(action) {
    if (mode === 'raw') {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const result = action.applyRaw(textarea);
      if (!result) return;
      onChange(result.newValue);
      // Selection restore has to wait for React to commit the new value
      // into the (still-mounted) textarea, otherwise setSelectionRange
      // applies to the stale pre-update text.
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(result.selStart, result.selEnd);
      });
    } else {
      const el = richRef.current;
      if (!el) return;
      el.focus();
      action.applyRich();
      handleRichInput();
    }
  }

  return (
    <div className="markdown-editor">
      <div className="markdown-editor-toolbar">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="markdown-editor-toolbar-btn"
            title={action.label}
            aria-label={action.label}
            // Prevents the button from stealing focus (and collapsing the
            // rich editor's selection) before the click handler runs —
            // without this, execCommand has nothing to act on.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runAction(action)}
            disabled={disabled}
          >
            <action.Icon size={15} strokeWidth={1.8} />
          </button>
        ))}
        <button
          type="button"
          className={`markdown-editor-toolbar-btn markdown-editor-mode-toggle${mode === 'raw' ? ' active' : ''}`}
          title={mode === 'raw' ? 'Ver formatado' : 'Ver Markdown'}
          aria-label={mode === 'raw' ? 'Ver formatado' : 'Ver Markdown'}
          aria-pressed={mode === 'raw'}
          onClick={() => setMode((m) => (m === 'raw' ? 'rich' : 'raw'))}
        >
          {mode === 'raw' ? <Eye size={15} strokeWidth={1.8} /> : <FileCode size={15} strokeWidth={1.8} />}
        </button>
      </div>

      {mode === 'raw' ? (
        <textarea
          ref={textareaRef}
          className="markdown-editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Anotações sobre o curso, em Markdown…"
        />
      ) : (
        <div
          ref={richRef}
          className="markdown-editor-rich"
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleRichInput}
          data-placeholder="Anotações sobre o curso…"
        />
      )}
    </div>
  );
}
