'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Paperclip } from 'lucide-react';
import SortIcon from './SortIcon';
import Modal from './Modal';
import { getCustomPrompt } from '@/lib/customPrompts';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

// The Conversation list endpoint doesn't reliably populate `start_at` in
// every Canvas instance — `last_message_at` (when the last message was
// actually sent) is the field that's consistently present, so it's tried
// first with `start_at` only as a fallback.
function conversationDate(conversation) {
  return conversation.last_message_at || conversation.start_at || null;
}

// The list endpoint doesn't give a clean "author of the last message" field
// for group threads — `properties` includes 'last_author' when the CURRENT
// user wrote it (so "Você"); otherwise we fall back to the other
// participant(s), which is exact for the common 1:1 case and an honest
// approximation ("Fulano +N") for group conversations, without needing an
// extra per-conversation API call just to read message authorship.
function senderName(conversation, currentUserId) {
  if (conversation.properties?.includes('last_author')) return 'Você';
  const participants = conversation.participants || [];
  const others = currentUserId ? participants.filter((p) => p.id !== currentUserId) : participants;
  const pool = others.length ? others : participants;
  if (pool.length === 0) return '—';
  if (pool.length === 1) return pool[0].name;
  return `${pool[0].name} +${pool.length - 1}`;
}

// Once the full thread is fetched, each individual message has a real
// author_id — no approximation needed like senderName() above.
function authorName(message, participants, currentUserId) {
  if (message.author_id === currentUserId) return 'Você';
  return participants?.find((p) => p.id === message.author_id)?.name || 'Desconhecido';
}

// Only flags that attachments exist (icon + count), per request — never
// lists filenames or offers a download, this app has no file-serving story
// for Canvas attachments.
function attachmentFlag(message) {
  const fileCount = message.attachments?.length || 0;
  const hasMedia = Boolean(message.media_comment);
  if (!fileCount && !hasMedia) return null;
  const parts = [];
  if (fileCount) parts.push(`${fileCount} anexo${fileCount > 1 ? 's' : ''}`);
  if (hasMedia) parts.push('mídia anexada');
  return parts.join(', ');
}

// Canvas's Inbox is a single-page app with no confirmed, documented way to
// deep-link to one specific conversation (unlike courses/quizzes, which have
// stable REST-backed URLs) — a `conversationId` hash param was tried and
// didn't work against a real Canvas instance. The next best, verifiable
// thing: land on the Inbox already filtered to the message's course, using
// the same `#filter=type=inbox,course_<id>` hash format Canvas's own UI uses
// elsewhere to link into a course-scoped Inbox view. `audience_contexts` is
// already on the conversation object (see src/lib/messageGrouping.js), so no
// extra prop/data is needed here.
function conversationUrl(baseUrl, conversation) {
  const courseId = Object.keys(conversation.audience_contexts?.courses || {})[0];
  const filter = courseId ? `type=inbox,course_${courseId}` : 'type=inbox';
  return `${baseUrl}/conversations#filter=${filter}`;
}

const SORTERS = {
  unread: (c) => (c.workflow_state === 'unread' ? 0 : 1),
  subject: (c) => c.subject?.toLowerCase() ?? '',
  sender: (c, currentUserId) => senderName(c, currentUserId).toLowerCase(),
  date: (c) => {
    const iso = conversationDate(c);
    return iso ? new Date(iso).getTime() : 0;
  },
};

// Shared by the per-course messages screen (courses/[courseId]/mensagens,
// already scoped to one course) and each course group on the global one
// (/mensagens) — course context doesn't need its own column here since both
// callers already scope the list to a single course before rendering it.
// `providers` (from src/lib/aiProviders, filtered to ones the user has a key
// for) powers the "Sugerir resposta com IA" action on each expanded row.
export default function MessageList({ conversations, currentUserId, baseUrl, providers = [] }) {
  const [sort, setSort] = useState({ key: 'date', direction: 'desc' });
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  // conversation id -> { status: 'loading'|'loaded'|'error', messages, error }
  const [threads, setThreads] = useState({});
  const [providerId, setProviderId] = useState(providers[0]?.id || '');
  const [suggesting, setSuggesting] = useState(null); // conversation id currently loading, or null
  const [suggestError, setSuggestError] = useState(null);
  const [suggestion, setSuggestion] = useState(null); // { text } | null
  const [archivedIds, setArchivedIds] = useState(() => new Set());
  const [archiving, setArchiving] = useState(null); // conversation id currently archiving, or null
  const [archiveError, setArchiveError] = useState(null);

  const visible = useMemo(
    () => conversations.filter((c) => !archivedIds.has(c.id)),
    [conversations, archivedIds],
  );

  const sorted = useMemo(() => {
    const getValue = SORTERS[sort.key];
    const sign = sort.direction === 'asc' ? 1 : -1;
    return [...visible].sort((a, b) => {
      const va = getValue(a, currentUserId);
      const vb = getValue(b, currentUserId);
      if (va < vb) return -1 * sign;
      if (va > vb) return 1 * sign;
      return 0;
    });
  }, [visible, currentUserId, sort]);

  function toggleSort(key) {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  }

  function sortAria(key) {
    if (sort.key !== key) return 'none';
    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  async function loadThread(conversationId) {
    setThreads((prev) => ({ ...prev, [conversationId]: { status: 'loading' } }));
    try {
      const response = await fetch(`/api/canvas/conversations/${conversationId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao carregar a conversa completa.');
      const messages = [...(data.conversation.messages || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setThreads((prev) => ({
        ...prev,
        [conversationId]: { status: 'loaded', messages, participants: data.conversation.participants || [] },
      }));
    } catch (err) {
      setThreads((prev) => ({ ...prev, [conversationId]: { status: 'error', error: err.message } }));
    }
  }

  function toggleExpanded(conversationId) {
    const wasExpanded = expandedIds.has(conversationId);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (wasExpanded) next.delete(conversationId);
      else next.add(conversationId);
      return next;
    });
    if (!wasExpanded && !threads[conversationId]) {
      loadThread(conversationId);
    }
  }

  async function handleSuggestReply(conversation) {
    setSuggesting(conversation.id);
    setSuggestError(null);
    try {
      const custom = await getCustomPrompt('suggestReply');
      const response = await fetch(`/api/ai/${providerId}/suggest-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: conversation.subject,
          sender: senderName(conversation, currentUserId),
          message: conversation.last_message,
          customPromptText: custom?.text,
          customPromptMode: custom?.mode,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSuggestError(data.error || 'Falha ao gerar sugestão de resposta.');
      } else {
        setSuggestion({ text: data.reply });
      }
    } catch (err) {
      setSuggestError(err.message);
    } finally {
      setSuggesting(null);
    }
  }

  async function handleArchive(conversation) {
    setArchiving(conversation.id);
    setArchiveError(null);
    try {
      const response = await fetch(`/api/canvas/conversations/${conversation.id}`, { method: 'PUT' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao arquivar a mensagem.');
      setArchivedIds((prev) => new Set(prev).add(conversation.id));
    } catch (err) {
      setArchiveError(err.message);
    } finally {
      setArchiving(null);
    }
  }

  if (visible.length === 0) {
    return <p className="lede">Nenhuma mensagem encontrada.</p>;
  }

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            <th>
              <span className="sr-only">Expandir</span>
            </th>
            <th aria-sort={sortAria('unread')}>
              <button type="button" className="th-sort-btn" onClick={() => toggleSort('unread')}>
                <span className="sr-only">Não lida</span>
                <SortIcon direction={sort.key === 'unread' ? sort.direction : null} />
              </button>
            </th>
            <th aria-sort={sortAria('subject')}>
              <button type="button" className="th-sort-btn" onClick={() => toggleSort('subject')}>
                Assunto
                <SortIcon direction={sort.key === 'subject' ? sort.direction : null} />
              </button>
            </th>
            <th aria-sort={sortAria('sender')}>
              <button type="button" className="th-sort-btn" onClick={() => toggleSort('sender')}>
                Remetente
                <SortIcon direction={sort.key === 'sender' ? sort.direction : null} />
              </button>
            </th>
            <th>Mensagem</th>
            <th aria-sort={sortAria('date')}>
              <button type="button" className="th-sort-btn" onClick={() => toggleSort('date')}>
                Data
                <SortIcon direction={sort.key === 'date' ? sort.direction : null} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((conversation) => {
            const expanded = expandedIds.has(conversation.id);
            const thread = threads[conversation.id];
            return (
              <Fragment key={conversation.id}>
                <tr>
                  <td className="expand-cell">
                    <button
                      type="button"
                      className="row-expand-btn"
                      onClick={() => toggleExpanded(conversation.id)}
                      aria-expanded={expanded}
                      aria-label={expanded ? 'Recolher mensagem' : 'Expandir mensagem'}
                    >
                      <span className={`group-chevron${expanded ? ' expanded' : ''}`} aria-hidden="true">
                        <ChevronRight size={16} strokeWidth={2} />
                      </span>
                    </button>
                  </td>
                  <td className="status-cell">
                    {conversation.workflow_state === 'unread' && (
                      <span className="unread-dot" title="Não lida" aria-label="Não lida" />
                    )}
                  </td>
                  <td className="course-name-cell">
                    <button
                      type="button"
                      className="subject-toggle-btn"
                      onClick={() => toggleExpanded(conversation.id)}
                      aria-expanded={expanded}
                    >
                      {conversation.subject || '(sem assunto)'}
                    </button>
                  </td>
                  <td>{senderName(conversation, currentUserId)}</td>
                  <td className="message-snippet">{conversation.last_message || '—'}</td>
                  <td className="pending-cell">{formatDate(conversationDate(conversation))}</td>
                </tr>
                {expanded && (
                  <tr className="message-detail-row">
                    <td colSpan={6}>
                      <div className="message-detail">
                        <div className="message-detail-actions">
                          <Link
                            href={conversationUrl(baseUrl, conversation)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                          >
                            Abrir no Canvas
                          </Link>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={archiving === conversation.id}
                            onClick={() => handleArchive(conversation)}
                          >
                            {archiving === conversation.id ? 'Arquivando…' : 'Arquivar'}
                          </button>

                          {providers.length > 0 && (
                            <>
                              {providers.length > 1 && (
                                <select
                                  aria-label="Motor de IA"
                                  value={providerId}
                                  onChange={(e) => setProviderId(e.target.value)}
                                >
                                  {providers.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={suggesting === conversation.id}
                                onClick={() => handleSuggestReply(conversation)}
                              >
                                {suggesting === conversation.id ? 'Gerando…' : 'Sugerir resposta com IA'}
                              </button>
                            </>
                          )}
                        </div>
                        {providers.length === 0 && (
                          <p className="lede">
                            Configure uma chave de API de IA em <Link href="/perfil">seu perfil</Link> para sugerir
                            respostas.
                          </p>
                        )}

                        {thread?.status === 'loading' && <p className="lede">Carregando conversa…</p>}
                        {thread?.status === 'error' && (
                          <p className="alert alert-error" role="alert">
                            {thread.error}
                          </p>
                        )}
                        {thread?.status === 'loaded' && (
                          <ul className="thread-list">
                            {thread.messages.map((message) => {
                              const attachments = attachmentFlag(message);
                              return (
                                <li key={message.id} className="thread-message">
                                  <div className="thread-message-meta">
                                    <span className="thread-message-sender">
                                      {authorName(message, thread.participants, currentUserId)}
                                    </span>
                                    <span className="thread-message-date">{formatDate(message.created_at)}</span>
                                  </div>
                                  <p className="thread-message-text">{message.body}</p>
                                  {attachments && (
                                    <span className="thread-attachment-flag">
                                      <Paperclip size={12} strokeWidth={2} />
                                      {attachments}
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {archiveError && (
        <p className="alert alert-error" role="alert">
          {archiveError}
        </p>
      )}

      {suggestError && (
        <p className="alert alert-error" role="alert">
          {suggestError}
        </p>
      )}

      {suggestion && (
        <Modal title="Sugestão de resposta" onClose={() => setSuggestion(null)}>
          <p className="message-detail-text">{suggestion.text}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigator.clipboard.writeText(suggestion.text)}
          >
            Copiar resposta
          </button>
        </Modal>
      )}
    </>
  );
}
