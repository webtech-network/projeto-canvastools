'use client';

import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import MessageList from './MessageList';
import { groupConversationsByCourse } from '@/lib/messageGrouping';

function groupKey(group) {
  return group.course ? String(group.course.id) : 'other';
}

// All conversations for every favorite course are fetched once, up front
// (see mensagens/page.jsx) — grouping and the course filter both happen
// client-side here so switching courses/expanding groups never re-hits
// the Canvas API.
export default function MessageBrowser({ courses, conversations, currentUserId, baseUrl, providers }) {
  const [courseFilter, setCourseFilter] = useState('');
  const [collapsedKeys, setCollapsedKeys] = useState(() => new Set());

  // Favorite courses with zero messages don't get a section at all — the
  // select still lists every favorite course, so picking one of those just
  // shows the "nenhuma mensagem" empty state instead of an empty section.
  const groups = useMemo(
    () => groupConversationsByCourse(conversations, courses).filter((g) => g.conversations.length > 0),
    [conversations, courses],
  );
  const visibleGroups = courseFilter ? groups.filter((g) => groupKey(g) === courseFilter) : groups;

  function toggleGroup(key) {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expandAll() {
    setCollapsedKeys(new Set());
  }

  function collapseAll() {
    setCollapsedKeys(new Set(groups.map(groupKey)));
  }

  return (
    <div className="message-browser">
      <div className="browser-controls">
        <div className="provider-select">
          <label htmlFor="course-filter">Curso</label>
          <select id="course-filter" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="">Todos os favoritos</option>
            {courses.map((course) => (
              <option key={course.id} value={String(course.id)}>
                {course.name}
              </option>
            ))}
          </select>
        </div>
        <div className="segmented" role="group" aria-label="Expandir ou recolher grupos de mensagens">
          <button type="button" className="segmented-btn" onClick={expandAll}>
            Expandir tudo
          </button>
          <button type="button" className="segmented-btn" onClick={collapseAll}>
            Recolher tudo
          </button>
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <p className="lede">Nenhuma mensagem encontrada.</p>
      ) : (
        visibleGroups.map((group) => {
          const key = groupKey(group);
          const collapsed = collapsedKeys.has(key);
          const title = group.course ? group.course.name : 'Outras mensagens';
          return (
            <section className="message-group" key={key}>
              <button
                type="button"
                className="message-group-header"
                onClick={() => toggleGroup(key)}
                aria-expanded={!collapsed}
              >
                <span className={`group-chevron${collapsed ? '' : ' expanded'}`} aria-hidden="true">
                  <ChevronRight size={16} strokeWidth={2} />
                </span>
                <span className="group-title">{title}</span>
                <span className={`pending-badge${group.conversations.length ? ' has-pending' : ''}`}>
                  {group.conversations.length}
                </span>
              </button>
              {!collapsed && (
                <div className="message-group-body">
                  <MessageList
                    conversations={group.conversations}
                    currentUserId={currentUserId}
                    baseUrl={baseUrl}
                    providers={providers}
                  />
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
