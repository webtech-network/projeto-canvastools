'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildCalendarMonth } from '@/lib/dashboard';

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Received items carry `dueAt` as an ISO string (from the API response or
// the IndexedDB cache) — re-hydrated into Date objects here so
// buildCalendarMonth (shared with the API route) can do its date math.
function toDateItems(items) {
  return (items || []).map((i) => ({ ...i, dueAt: new Date(i.dueAt) }));
}

export default function DueDateCalendar({ items, loading }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const [selectedDay, setSelectedDay] = useState(null);

  const dueDateItems = useMemo(() => toDateItems(items), [items]);
  const { weeks } = useMemo(() => buildCalendarMonth(dueDateItems, cursor), [dueDateItems, cursor]);

  function goPrevMonth() {
    setCursor(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
    setSelectedDay(null);
  }
  function goNextMonth() {
    setCursor(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));
    setSelectedDay(null);
  }

  return (
    <section className="dashboard-card">
      <div className="calendar-nav">
        <button type="button" className="btn btn-ghost btn-sm" onClick={goPrevMonth} aria-label="Mês anterior">
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <strong>
          {MONTH_LABELS[cursor.month]} {cursor.year}
        </strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={goNextMonth} aria-label="Próximo mês">
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      {loading ? (
        <p className="lede">Carregando calendário…</p>
      ) : (
        <>
          <div className="calendar-grid calendar-weekdays">
            {WEEKDAY_LABELS.map((w, i) => (
              <span key={i} className="calendar-weekday">
                {w}
              </span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div className="calendar-grid" key={wi}>
              {week.map((day, di) =>
                day ? (
                  <button
                    type="button"
                    key={di}
                    className={`calendar-cell${day.items.length ? ' has-items' : ''}${
                      isSameDate(day.date, today) ? ' is-today' : ''
                    }${selectedDay && isSameDate(selectedDay.date, day.date) ? ' is-selected' : ''}`}
                    onClick={() => setSelectedDay(day.items.length ? day : null)}
                  >
                    {day.date.getDate()}
                  </button>
                ) : (
                  <span key={di} className="calendar-cell calendar-cell-blank" />
                ),
              )}
            </div>
          ))}

          {selectedDay && selectedDay.items.length > 0 && (
            <ul className="card-list calendar-day-items">
              {selectedDay.items.map((item) => (
                <li key={item.id}>
                  <a href={item.htmlUrl} target="_blank" rel="noopener noreferrer" className="card-link">
                    <span className="card-title">{item.name}</span>
                    <span className="card-meta">{item.courseName}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
