'use client';

import { useState } from 'react';

export interface CalendarItem {
  id: string;
  label: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  color: string;
  bg: string;
  subtitle?: string;
  onClick?: () => void;
}

interface Props {
  items: CalendarItem[];
  title?: string;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function MonthCalendar({ items, title }: Props) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  function prev() {
    if (month === 0) { setYear((currentYear) => currentYear - 1); setMonth(11); }
    else { setMonth((currentMonth) => currentMonth - 1); }
  }
  function next() {
    if (month === 11) { setYear((currentYear) => currentYear + 1); setMonth(0); }
    else { setMonth((currentMonth) => currentMonth + 1); }
  }

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function itemsForDay(day: number): CalendarItem[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return items.filter((item) => item.start_date <= dateStr && item.end_date >= dateStr);
  }

  const todayStr = ymd(now);

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
        {title && <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <button onClick={prev} style={{ background: 'none', border: '1px solid var(--border-light)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', minWidth: 140, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={next} style={{ background: 'none', border: '1px solid var(--border-light)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-light)' }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ padding: '8px 4px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {w}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((day, idx) => {
          const isToday = day !== null && `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` === todayStr;
          const dayItems = day !== null ? itemsForDay(day) : [];
          return (
            <div
              key={idx}
              style={{
                minHeight: 58,
                padding: '4px 5px',
                borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border-light)' : 'none',
                borderBottom: idx < cells.length - 7 ? '1px solid var(--border-light)' : 'none',
                background: day === null ? 'var(--bg-subtle)' : '#fff',
              }}
            >
              {day !== null && (
                <>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#fff' : 'var(--text-secondary)',
                    background: isToday ? 'var(--primary)' : 'transparent',
                    width: 22, height: 22, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 3,
                  }}>
                    {day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={item.onClick}
                        title={item.subtitle ? `${item.label} — ${item.subtitle}` : item.label}
                        style={{
                          background: item.bg,
                          color: item.color,
                          borderRadius: 3,
                          padding: '1px 4px',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          cursor: item.onClick ? 'pointer' : 'default',
                          borderLeft: `3px solid ${item.color}`,
                        }}
                      >
                        {item.label}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', paddingLeft: 4 }}>
                        +{dayItems.length - 3} mais
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
