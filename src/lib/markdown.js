// Deliberately minimal Markdown → HTML renderer — not a CommonMark
// implementation, just enough to preview what MarkdownEditor.jsx's own
// toolbar can produce (headings, bold, italic, inline/fenced code, links,
// bullet/numbered lists, blockquotes, paragraphs). No new npm dependency,
// matching this app's existing "raw platform APIs over a library" pattern
// (see settingsCrypto.js's use of Web Crypto). Escapes raw text first, so
// output is only ever built from HTML this function itself generates.
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?:^|[^_])_([^_]+)_(?!_)/g, (match, inner) => match.replace(`_${inner}_`, `<em>${inner}</em>`));
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return html;
}

export function markdownToHtml(source) {
  if (!source?.trim()) return '';
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const htmlBlocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      htmlBlocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      htmlBlocks.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i += 1;
      }
      htmlBlocks.push(`<blockquote>${renderInline(quoteLines.join(' '))}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^[-*]\s+/, ''))}</li>`);
        i += 1;
      }
      htmlBlocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\d+\.\s+/, ''))}</li>`);
        i += 1;
      }
      htmlBlocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const paragraphLines = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,4}\s|>\s|[-*]\s|\d+\.\s|```)/.test(lines[i])) {
      paragraphLines.push(lines[i]);
      i += 1;
    }
    htmlBlocks.push(`<p>${renderInline(paragraphLines.join(' '))}</p>`);
  }

  return htmlBlocks.join('\n');
}

// Reverse of markdownToHtml — walks a contentEditable element's DOM (see
// MarkdownEditor.jsx's rich-mode toolbar, which edits via
// document.execCommand + direct Range manipulation, not this app's own
// generated HTML) and serializes it back to the same Markdown vocabulary.
// Not a general HTML→Markdown converter: only handles the tags
// markdownToHtml itself produces plus what Chrome's execCommand produces
// for the same actions (<b>/<strong>, <i>/<em>, <div> as a soft paragraph
// break — Chrome's default Enter-key behavior in a contentEditable).
function inlineToMarkdown(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const tag = node.tagName.toLowerCase();
  const inner = [...node.childNodes].map(inlineToMarkdown).join('');
  switch (tag) {
    case 'b':
    case 'strong':
      return inner.trim() ? `**${inner}**` : inner;
    case 'i':
    case 'em':
      return inner.trim() ? `_${inner}_` : inner;
    case 'code':
      return inner.trim() ? `\`${inner}\`` : inner;
    case 'a':
      return `[${inner}](${node.getAttribute('href') || ''})`;
    case 'br':
      return '\n';
    default:
      return inner;
  }
}

const BLOCK_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol', 'pre', 'div', 'p']);

function blockToMarkdown(node) {
  const tag = node.tagName.toLowerCase();
  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4': {
      const level = Number(tag[1]);
      const text = inlineToMarkdown(node).trim();
      return text ? `${'#'.repeat(level)} ${text}` : '';
    }
    case 'blockquote': {
      const text = inlineToMarkdown(node).trim();
      return text ? `> ${text}` : '';
    }
    case 'ul':
      return [...node.children]
        .map((li) => `- ${inlineToMarkdown(li).trim()}`)
        .filter((line) => line !== '- ')
        .join('\n');
    case 'ol':
      return [...node.children]
        .map((li, i) => `${i + 1}. ${inlineToMarkdown(li).trim()}`)
        .filter((line, i) => line !== `${i + 1}. `)
        .join('\n');
    case 'pre':
      return '```\n' + node.textContent + '\n```';
    // Chrome wraps each soft line in a <div> (or <p>) inside a plain
    // contentEditable by default — both are just "one paragraph" here.
    case 'div':
    case 'p':
    default:
      return inlineToMarkdown(node).trim();
  }
}

// Root-level children of a contentEditable aren't guaranteed to be
// block-level: before the first Enter keypress (or after selecting the
// whole line and formatting it inline), plain text and inline elements
// (<b>, <i>, a bare text node) sit directly under the root with no
// wrapping <div>/<p>. Those get accumulated into a running paragraph buffer
// instead of each becoming its own top-level block — only a real block tag
// (heading/list/quote/pre/div/p) starts a new one.
export function htmlToMarkdown(root) {
  if (!root) return '';

  const blocks = [];
  let paragraphBuffer = '';

  function flushParagraph() {
    const text = paragraphBuffer.trim();
    if (text) blocks.push(text);
    paragraphBuffer = '';
  }

  for (const node of root.childNodes) {
    const isBlock = node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.tagName.toLowerCase());
    if (isBlock) {
      flushParagraph();
      const block = blockToMarkdown(node);
      if (block) blocks.push(block);
    } else {
      paragraphBuffer += inlineToMarkdown(node);
    }
  }
  flushParagraph();

  return blocks.join('\n\n');
}
