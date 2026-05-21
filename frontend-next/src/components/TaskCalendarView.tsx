'use client';

import { useState, useMemo } from 'react';
import type { Task } from '@/types';
import { avatarColor, initials } from '@/lib/utils';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const PRIORITY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  'Alta':  { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  'Média': { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  'Baixa': { color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
};
function getPriorityStyle(priority: string) {
  return PRIORITY_STYLES[priority] ?? { color: '#6b778c', bg: '#f4f5f7', border: '#dfe1e6' };
}

function ymd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function taskInDay(task: Task, dayStr: string): boolean {
  const start = task.date;
  const end = task.deadline ?? task.date;
  return start <= dayStr && end >= dayStr;
}

function formatDayLabel(dayStr: string): string {
  const date = new Date(dayStr + 'T00:00:00');
  return `${WEEKDAYS_LONG[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

// ── Month View ────────────────────────────────────────────────────────────────

function MonthView({ tasks, year, month, todayStr, selectedDay, onDayClick, onViewTask }: {
  tasks: Task[]; year: number; month: number; todayStr: string;
  selectedDay: string | null; onDayClick: (dayStr: string) => void;
  onViewTask: (task: Task) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number|null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ padding: '10px 4px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {w}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridAutoRows: 'minmax(96px, auto)' }}>
        {cells.map((day, idx) => {
          const dayStr = day ? `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '';
          const isToday = dayStr === todayStr;
          const isSel = dayStr === selectedDay;
          const dayTasks = dayStr ? tasks.filter((task) => taskInDay(task, dayStr)) : [];
          const hasPriority = (priorityLabel: string) => dayTasks.some((task) => task.priority === priorityLabel);
          return (
            <div
              key={idx}
              onClick={() => day && onDayClick(dayStr)}
              style={{
                padding: '4px 5px',
                borderRight: (idx+1)%7 !== 0 ? '1px solid var(--border-light)' : 'none',
                borderBottom: idx < cells.length - 7 ? '1px solid var(--border-light)' : 'none',
                background: day === null ? '#f8fafc' : isSel ? '#eff6ff' : isToday ? '#f0f7ff' : '#fff',
                overflow: 'hidden',
                cursor: day ? 'pointer' : 'default',
                outline: isSel ? '2px solid var(--primary)' : 'none',
                outlineOffset: '-2px',
                transition: 'background 0.12s',
              }}
            >
              {day && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{
                      fontSize: '0.75rem', fontWeight: isToday ? 700 : isSel ? 700 : 400,
                      color: isToday ? '#fff' : isSel ? 'var(--primary)' : dayTasks.length > 0 ? '#172b4d' : 'var(--text-muted)',
                      background: isToday ? 'var(--primary)' : 'transparent',
                      width: 24, height: 24, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{day}</div>
                    {dayTasks.length > 0 && (
                      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {hasPriority('Alta') && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />}
                        {hasPriority('Média') && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706' }} />}
                        {hasPriority('Baixa') && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />}
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: 1 }}>
                          {dayTasks.length}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    {dayTasks.slice(0, 3).map((task) => {
                      const priorityStyle = getPriorityStyle(task.priority);
                      return (
                        <div
                          key={task.id}
                          onClick={(e) => { e.stopPropagation(); onViewTask(task); }}
                          title={task.activity}
                          style={{
                            background: priorityStyle.bg, borderLeft: `3px solid ${priorityStyle.color}`,
                            borderRadius: 4, padding: '2px 5px', marginBottom: 2, cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: '0.63rem', fontWeight: 600, color: priorityStyle.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.activity}
                          </div>
                          {task.responsible && (
                            <div style={{ fontSize: '0.57rem', color: priorityStyle.color, opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.responsible}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div style={{
                        fontSize: '0.62rem', fontWeight: 700,
                        color: 'var(--primary)',
                        background: 'var(--primary-light)',
                        border: '1px solid var(--primary)',
                        borderRadius: 10, padding: '1px 7px',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        marginTop: 2, cursor: 'pointer',
                      }}>
                        +{dayTasks.length - 3} ver mais
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────

function WeekView({ tasks, weekStart, todayStr, onViewTask }: {
  tasks: Task[]; weekStart: Date; todayStr: string;
  onViewTask: (task: Task) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    return dayDate;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
      {days.map((dayDate, idx) => {
        const dayStr = ymd(dayDate);
        const isToday = dayStr === todayStr;
        const dayTasks = tasks.filter((task) => taskInDay(task, dayStr));
        return (
          <div key={idx} style={{ borderRight: idx < 6 ? '1px solid var(--border-light)' : 'none', minHeight: 320 }}>
            <div style={{
              padding: '10px 8px 8px', borderBottom: '1px solid var(--border-light)',
              textAlign: 'center', background: isToday ? '#f0f7ff' : 'var(--bg-subtle)',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isToday ? 'var(--primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {WEEKDAYS[dayDate.getDay()]}
              </div>
              <div style={{
                fontSize: '1.15rem', fontWeight: isToday ? 700 : 400,
                color: isToday ? '#fff' : 'var(--text-primary)',
                background: isToday ? 'var(--primary)' : 'transparent',
                width: 34, height: 34, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '4px auto 0',
              }}>{dayDate.getDate()}</div>
              {dayTasks.length > 0 && (
                <div style={{ marginTop: 4, fontSize: '0.65rem', fontWeight: 600, color: isToday ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {dayTasks.length} atividade{dayTasks.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <div style={{ padding: '6px 5px' }}>
              {dayTasks.map((task) => {
                const priorityStyle = getPriorityStyle(task.priority);
                return (
                  <div
                    key={task.id}
                    onClick={() => onViewTask(task)}
                    style={{
                      background: priorityStyle.bg, borderLeft: `4px solid ${priorityStyle.color}`,
                      borderRadius: 7, padding: '8px 10px', marginBottom: 6, cursor: 'pointer',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      transition: 'transform 0.12s, box-shadow 0.12s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = '';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: priorityStyle.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: priorityStyle.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {task.priority}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#172b4d', lineHeight: 1.35, marginBottom: 4 }}>
                      {task.activity}
                    </div>
                    {task.responsible && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%',
                          background: avatarColor(task.responsible),
                          fontSize: '0.5rem', fontWeight: 700, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {initials(task.responsible)}
                        </div>
                        <span style={{ fontSize: '0.69rem', color: priorityStyle.color, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.responsible}
                        </span>
                      </div>
                    )}
                    <div style={{ marginTop: 6 }}>
                      <span style={{
                        fontSize: '0.6rem', background: 'rgba(255,255,255,0.8)',
                        color: priorityStyle.color, borderRadius: 3, padding: '1px 6px',
                        fontWeight: 600, border: `1px solid ${priorityStyle.border}`,
                      }}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Day Panel ─────────────────────────────────────────────────────────────────

function DayPanel({ dayStr, tasks, onViewTask, onClose }: {
  dayStr: string; tasks: Task[]; onViewTask: (task: Task) => void; onClose: () => void;
}) {
  const dayTasks = tasks.filter((task) => taskInDay(task, dayStr));

  return (
    <div style={{
      borderTop: '2px solid var(--primary)',
      background: '#f8faff',
      padding: '16px 20px',
      animation: 'slideDown 0.18s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#172b4d' }}>
            {formatDayLabel(dayStr)}
          </span>
          <span style={{
            background: dayTasks.length === 0 ? '#f4f5f7' : 'var(--primary)',
            color: dayTasks.length === 0 ? 'var(--text-muted)' : '#fff',
            borderRadius: 20, padding: '2px 10px',
            fontSize: '0.72rem', fontWeight: 700,
          }}>
            {dayTasks.length} atividade{dayTasks.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1, padding: '2px 6px', borderRadius: 4 }}
          title="Fechar"
        >
          ×
        </button>
      </div>

      {dayTasks.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, padding: '12px 0' }}>
          Nenhuma atividade neste dia.
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {dayTasks.map((task) => {
            const priorityStyle = getPriorityStyle(task.priority);
            return (
              <div
                key={task.id}
                onClick={() => onViewTask(task)}
                style={{
                  background: '#fff', borderLeft: `4px solid ${priorityStyle.color}`,
                  borderRadius: 8, padding: '12px 14px',
                  cursor: 'pointer', minWidth: 220, maxWidth: 300, flex: '1 1 220px',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
                  border: `1px solid ${priorityStyle.border}`,
                  borderLeftWidth: 4,
                  transition: 'transform 0.12s, box-shadow 0.12s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.10)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.07)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: priorityStyle.color,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: priorityStyle.color, display: 'inline-block' }} />
                    {task.priority ?? '—'}
                  </span>
                  <span style={{
                    fontSize: '0.62rem', background: priorityStyle.bg, color: priorityStyle.color,
                    borderRadius: 4, padding: '2px 7px', fontWeight: 600,
                    border: `1px solid ${priorityStyle.border}`,
                  }}>
                    {task.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#172b4d', lineHeight: 1.4, marginBottom: 8 }}>
                  {task.activity}
                </div>

                {task.description && (
                  <div style={{ fontSize: '0.75rem', color: '#6b778c', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {task.description}
                  </div>
                )}

                {task.responsible && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: avatarColor(task.responsible),
                      fontSize: '0.52rem', fontWeight: 700, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {initials(task.responsible)}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#344563', fontWeight: 500 }}>
                      {task.responsible}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  tasks: Task[];
  onViewTask: (task: Task) => void;
}

export default function TaskCalendarView({ tasks, onViewTask }: Props) {
  const now = new Date();
  const todayStr = ymd(now);

  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const initialWeekStart = new Date(now);
    initialWeekStart.setDate(initialWeekStart.getDate() - initialWeekStart.getDay());
    initialWeekStart.setHours(0, 0, 0, 0);
    return initialWeekStart;
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const weekEnd = useMemo(() => {
    const endDate = new Date(weekStart); endDate.setDate(endDate.getDate() + 6); return endDate;
  }, [weekStart]);

  function prevPeriod() {
    setSelectedDay(null);
    if (viewMode === 'month') { if (month === 0) { setYear((currentYear) => currentYear - 1); setMonth(11); } else setMonth((currentMonth) => currentMonth - 1); }
    else setWeekStart((currentWeekStart) => { const newWeekStart = new Date(currentWeekStart); newWeekStart.setDate(newWeekStart.getDate() - 7); return newWeekStart; });
  }
  function nextPeriod() {
    setSelectedDay(null);
    if (viewMode === 'month') { if (month === 11) { setYear((currentYear) => currentYear + 1); setMonth(0); } else setMonth((currentMonth) => currentMonth + 1); }
    else setWeekStart((currentWeekStart) => { const newWeekStart = new Date(currentWeekStart); newWeekStart.setDate(newWeekStart.getDate() + 7); return newWeekStart; });
  }
  function goToday() {
    setSelectedDay(null);
    const today = new Date();
    setYear(today.getFullYear()); setMonth(today.getMonth());
    const weekStartDate = new Date(today); weekStartDate.setDate(today.getDate() - today.getDay()); weekStartDate.setHours(0, 0, 0, 0); setWeekStart(weekStartDate);
  }

  function handleDayClick(dayStr: string) {
    setSelectedDay((currentDay) => currentDay === dayStr ? null : dayStr);
  }

  const headerLabel = viewMode === 'month'
    ? `${MONTHS[month]} ${year}`
    : `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0, 3)} – ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`;

  const tasksWithDate = tasks.filter((task) => !!task.date);
  const totalInView = viewMode === 'month'
    ? tasksWithDate.filter((task) => {
        const monthFirst = `${year}-${String(month+1).padStart(2,'0')}-01`;
        const monthLast  = `${year}-${String(month+1).padStart(2,'0')}-${String(new Date(year, month+1, 0).getDate()).padStart(2,'0')}`;
        const end = task.deadline ?? task.date;
        return task.date <= monthLast && end >= monthFirst;
      }).length
    : tasksWithDate.filter((task) => {
        const end = task.deadline ?? task.date;
        return task.date <= ymd(weekEnd) && end >= ymd(weekStart);
      }).length;

  return (
    <>
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid var(--border-light)',
        overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border-light)',
          flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', background: 'var(--bg-subtle)', borderRadius: 8, padding: 3, gap: 2 }}>
              {(['week', 'month'] as const).map(v => (
                <button key={v} onClick={() => { setViewMode(v); setSelectedDay(null); }} style={{
                  background: viewMode === v ? '#fff' : 'transparent',
                  border: viewMode === v ? '1px solid var(--border-light)' : '1px solid transparent',
                  borderRadius: 6, padding: '5px 14px', fontSize: '0.82rem', fontWeight: 600,
                  color: viewMode === v ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer', boxShadow: viewMode === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}>
                  {v === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
            {totalInView > 0 && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {totalInView} atividade{totalInView !== 1 ? 's' : ''} neste período
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={prevPeriod} style={NAV}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', minWidth: 200, textAlign: 'center' }}>
              {headerLabel}
            </span>
            <button onClick={nextPeriod} style={NAV}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <button onClick={goToday} style={{ background: 'none', border: '1px solid var(--border-light)', borderRadius: 7, padding: '5px 14px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>
            Hoje
          </button>
        </div>

        {viewMode === 'month'
          ? <MonthView
              tasks={tasksWithDate} year={year} month={month} todayStr={todayStr}
              selectedDay={selectedDay} onDayClick={handleDayClick} onViewTask={onViewTask}
            />
          : <WeekView tasks={tasksWithDate} weekStart={weekStart} todayStr={todayStr} onViewTask={onViewTask} />
        }

        {/* Day panel — only in month view */}
        {viewMode === 'month' && selectedDay && (
          <DayPanel
            dayStr={selectedDay}
            tasks={tasksWithDate}
            onViewTask={onViewTask}
            onClose={() => setSelectedDay(null)}
          />
        )}

        {/* Legend */}
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 16, alignItems: 'center', background: 'var(--bg-subtle)' }}>
          {[['Alta', '#dc2626'], ['Média', '#d97706'], ['Baixa', '#16a34a']].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
            </div>
          ))}
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Clique em um dia para ver as atividades
          </span>
        </div>
      </div>
    </>
  );
}

const NAV: React.CSSProperties = {
  background: 'none', border: '1px solid var(--border-light)', borderRadius: 6,
  width: 28, height: 28, cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
};
