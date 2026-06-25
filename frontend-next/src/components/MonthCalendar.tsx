'use client';

import { useState } from 'react';
import { Calendar, ChevronRight, ChevronLeft, ListTodo } from 'lucide-react';

export interface CalendarItem {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  color: string;
  bg: string;
  subtitle?: string;
  onClick?: () => void;
}

interface Props {
  items: CalendarItem[];
  title?: string;
  onClickDay?: (dateStr: string) => void;
  onMonthChange?: (year: number, month: number) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function MonthCalendar({ items, title, onClickDay, onMonthChange }: Props) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prev() {
    const newYear  = month === 0 ? year - 1 : year;
    const newMonth = month === 0 ? 11 : month - 1;
    setYear(newYear);
    setMonth(newMonth);
    onMonthChange?.(newYear, newMonth);
  }
  function next() {
    const newYear  = month === 11 ? year + 1 : year;
    const newMonth = month === 11 ? 0 : month + 1;
    setYear(newYear);
    setMonth(newMonth);
    onMonthChange?.(newYear, newMonth);
  }

  const firstDay = new Date(year, month, 1).getDay();
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
    <div style={{ background: '#fff', borderRadius: 3, border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(3,78,162,0.06)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 3, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar width={16} height={16} color="var(--primary)" />
          </div>
          {title && <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={prev} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 3, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'all 0.15s' }}>
            <ChevronLeft width={13} height={13} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', minWidth: 130, textAlign: 'center' }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={next} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 3, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'all 0.15s' }}>
            <ChevronRight width={13} height={13} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', background: 'var(--bg-app)', borderBottom: '1px solid var(--border-light)', overflowX: 'auto' }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{
            padding: '9px 4px',
            textAlign: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: i === 0 || i === 6 ? '#94a3b8' : 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {w}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', overflowX: 'auto' }}>
        {cells.map((day, idx) => {
          const col = idx % 7;
          const isWeekend = col === 0 || col === 6;
          const dayStr = day !== null ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
          const isToday = dayStr === todayStr;
          const dayItems = day !== null ? itemsForDay(day) : [];
          const hasItems = dayItems.length > 0;

          return (
            <div
              key={idx}
              onClick={() => day !== null && onClickDay && onClickDay(dayStr)}
              style={{
                minHeight: 100,
                overflow: 'hidden',
                padding: '6px 6px 6px',
                borderRight: col !== 6 ? '1px solid var(--border-light)' : 'none',
                borderBottom: idx < cells.length - 7 ? '1px solid var(--border-light)' : 'none',
                background: day === null ? 'var(--bg-app)' : isWeekend ? '#fafbfc' : '#fff',
                cursor: day !== null && onClickDay ? 'pointer' : undefined,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (day && onClickDay) (e.currentTarget as HTMLDivElement).style.background = 'var(--primary-light)'; }}
              onMouseLeave={e => { if (day) (e.currentTarget as HTMLDivElement).style.background = day === null ? 'var(--bg-app)' : isWeekend ? '#fafbfc' : '#fff'; }}
            >
              {day !== null && (
                <>
                  <div style={{
                    fontSize: '0.78rem',
                    fontWeight: isToday ? 800 : hasItems ? 600 : 400,
                    color: isToday ? '#fff' : isWeekend ? '#94a3b8' : 'var(--text-secondary)',
                    background: isToday ? 'var(--primary)' : 'transparent',
                    width: 24, height: 24, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 4, flexShrink: 0,
                    boxShadow: isToday ? '0 2px 6px rgba(3,78,162,0.35)' : 'none',
                  }}>
                    {day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        onClick={e => { e.stopPropagation(); item.onClick && item.onClick(); }}
                        title={item.subtitle ? `${item.label} — ${item.subtitle}` : item.label}
                        style={{
                          background: item.bg,
                          borderLeft: `3px solid ${item.color}`,
                          borderRadius: '0 4px 4px 0',
                          padding: '4px 6px',
                          overflow: 'hidden',
                          cursor: item.onClick ? 'pointer' : 'default',
                        }}
                      >
                        {item.subtitle && (
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: item.color, lineHeight: 1.3, marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle}</div>
                        )}
                        <div style={{ fontSize: '0.7rem', fontWeight: 500, color: item.color, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', paddingLeft: 4, fontWeight: 600 }}>
                        +{dayItems.length - 2} mais
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
