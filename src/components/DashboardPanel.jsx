'use client';

import { useEffect, useState } from 'react';
import { readCache, writeCache } from '@/lib/dashboardCache';
import DashboardStats from './DashboardStats';
import DueDateCalendar from './DueDateCalendar';
import RecentDeadlines from './RecentDeadlines';
import DashboardShortcuts from './DashboardShortcuts';

const CACHE_KEYS = {
  courses: 'dashboard:courses',
  messages: 'dashboard:messages',
  assignments: 'dashboard:assignments',
};

function emptySummary() {
  return { courses: null, students: null, messages: null, grading: null, calendar: null, recent: null };
}

// Stale-while-revalidate: paints instantly from whatever's in IndexedDB
// (marked `stale`), then always fires a fresh fetch in parallel and updates
// both the UI and the cache when it resolves. First-ever visit (no cache at
// all) shows the loading state instead of stale numbers.
export default function DashboardPanel() {
  const [summary, setSummary] = useState(emptySummary());
  const [stale, setStale] = useState(false);
  const [hasCache, setHasCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFromCache() {
      const [courses, messages, assignments] = await Promise.all([
        readCache(CACHE_KEYS.courses),
        readCache(CACHE_KEYS.messages),
        readCache(CACHE_KEYS.assignments),
      ]);
      if (cancelled) return;
      if (courses || messages || assignments) {
        setSummary({
          courses: courses?.data.courses ?? null,
          students: courses?.data.students ?? null,
          messages: messages?.data.messages ?? null,
          grading: assignments?.data.grading ?? null,
          calendar: assignments?.data.calendar ?? null,
          recent: assignments?.data.recent ?? null,
        });
        setHasCache(true);
        setStale(true);
        setLoading(false);
      }
    }

    async function loadFresh() {
      try {
        const response = await fetch('/api/dashboard/summary');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Falha ao carregar o painel.');
        if (cancelled) return;

        setSummary({
          courses: data.courses,
          students: data.students,
          messages: data.messages,
          grading: data.grading,
          calendar: data.calendar,
          recent: data.recent,
        });
        setStale(false);
        setLoading(false);
        setError(null);

        await Promise.all([
          writeCache(CACHE_KEYS.courses, { courses: data.courses, students: data.students }),
          writeCache(CACHE_KEYS.messages, { messages: data.messages }),
          writeCache(CACHE_KEYS.assignments, {
            grading: data.grading,
            calendar: data.calendar,
            recent: data.recent,
          }),
        ]);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      }
    }

    loadFromCache();
    loadFresh();

    return () => {
      cancelled = true;
    };
  }, []);

  const showLoading = loading && !hasCache;

  return (
    <div className="dashboard-panel">
      {error && !hasCache && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <DashboardStats
        courses={summary.courses}
        students={summary.students}
        messages={summary.messages}
        grading={summary.grading}
        loading={showLoading}
        stale={stale}
      />

      <div className="dashboard-grid">
        <DueDateCalendar items={summary.calendar?.items} loading={showLoading} />
        <RecentDeadlines items={summary.recent?.items} loading={showLoading} />
      </div>

      <DashboardShortcuts />
    </div>
  );
}
