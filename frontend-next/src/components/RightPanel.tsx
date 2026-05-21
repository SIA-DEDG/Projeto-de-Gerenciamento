'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { fetchTasks } from '@/lib/api';
import { useRefetchOnFocus } from '@/lib/useRefetchOnFocus';
import type { Task } from '@/types';

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function dateToYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function taskOnDate(task: Task, date: Date): boolean {
  const dayStr = dateToYmd(date);
  const start = task.date;
  const end = task.deadline ?? task.date;
  return !!start && start <= dayStr && end >= dayStr;
}

function priorityColor(priority: string) {
  const normalizedPriority = priority?.toLowerCase();
  if (normalizedPriority === 'alta') return '#ef4123';
  if (normalizedPriority === 'baixa') return '#007932';
  return '#c07800';
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function TaskQuickModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const deadlineOverdue = task.deadline && task.status_group !== 'done' && task.deadline < today;
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f2', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b778c', marginBottom: '6px' }}>SIA-{task.id.slice(0, 8)}</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#172b4d', lineHeight: 1.4, margin: 0 }}>{task.activity}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b778c', fontSize: '1.4rem', lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {task.description && (
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b778c', marginBottom: '6px' }}>Descrição</div>
              <div
                className="rich-content"
                style={{ fontSize: '0.875rem', color: '#344563', lineHeight: 1.7, padding: '10px 12px', background: '#f4f5f7', borderRadius: '6px' }}
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {task.responsible && (
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b778c', marginBottom: '4px' }}>Responsável</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#172b4d' }}>{task.responsible}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b778c', marginBottom: '4px' }}>Data de criação</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#172b4d' }}>{fmtDate(task.date)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b778c', marginBottom: '4px' }}>Prazo</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: deadlineOverdue ? '#de350b' : '#172b4d' }}>
                {task.deadline ? fmtDate(task.deadline) : '—'}
                {deadlineOverdue && ' ⚠'}
              </div>
            </div>
            {task.priority && (
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b778c', marginBottom: '4px' }}>Prioridade</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: priorityColor(task.priority), display: 'inline-block' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: priorityColor(task.priority) }}>{task.priority}</span>
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b778c', marginBottom: '4px' }}>Status</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#172b4d' }}>{task.status}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

export default function RightPanel({ open, onToggle, filterUser}: {
  open: boolean;
  onToggle: () => void;
  filterUser?: string;
}) {
  const today = new Date();
  const [selected, setSelected] = useState(today);
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quickTask, setQuickTask] = useState<Task | null>(null);

  const loadTasks = useCallback(() => {
    fetchTasks().then(setTasks).catch(() => null);
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useRefetchOnFocus(loadTasks);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDOW = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDOW).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const visibleTasks = filterUser
    ? tasks.filter((task) => {
      if (task.responsible === filterUser) return true;
      try {
        const coResponsibles: string[] = task.co_responsibles ? JSON.parse(task.co_responsibles) : [];
        return coResponsibles.includes(filterUser);
      } catch { return false; }
    })
    : tasks;

  const dayTasks = visibleTasks.filter((task) => taskOnDate(task, selected));

  function dayPriorities(day: number): string[] {
    const date = new Date(year, month, day);
    const tasksOnDay = visibleTasks.filter((task) => taskOnDate(task, date));
    const priorities = new Set(tasksOnDay.map((task) => task.priority?.toLowerCase()));
    const result: string[] = [];
    if (priorities.has('alta')) result.push('#dc2626');
    if (priorities.has('média') || priorities.has('media')) result.push('#d97706');
    if (priorities.has('baixa')) result.push('#16a34a');
    if (result.length === 0 && tasksOnDay.length > 0) result.push('#6b778c');
    return result;
  }

  return (
    <>
      <aside className={`right-panel${open ? '' : ' right-panel--collapsed'}`}>
        <div className="rp-header">
          <div className="rp-logo">
            {open && (
              <Image src="/logo-sia.svg" alt="SIA" width={110} height={32} style={{ objectFit: 'contain' }} />
            )}
          </div>
          <button
            className="rp-toggle-btn"
            onClick={onToggle}
            title={open ? 'Recolher calendário' : 'Expandir calendário'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={open ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
            </svg>
          </button>
        </div>

        <div className="rp-calendar">
          <div className="rp-cal-header">
            <button className="rp-cal-nav" onClick={() => setViewMonth(new Date(year, month - 1, 1))}>‹</button>
            <span className="rp-cal-title">{MONTHS[month]} {year}</span>
            <button className="rp-cal-nav" onClick={() => setViewMonth(new Date(year, month + 1, 1))}>›</button>
          </div>
          <div className="rp-cal-weekdays">
            {WEEK_DAYS.map((dayLabel, i) => <span key={i}>{dayLabel}</span>)}
          </div>
          <div className="rp-cal-grid">
            {cells.map((day, i) => {
              if (day === null) return <span key={i} />;
              const date = new Date(year, month, day);
              const isToday = sameDay(date, today);
              const isSel = sameDay(date, selected);
              const dots = dayPriorities(day);
              const hasDots = dots.length > 0;
              return (
                <button
                  key={i}
                  className={`rp-cal-day${isToday ? ' rp-today' : ''}${isSel ? ' rp-selected' : ''}${hasDots && !isSel ? ' rp-has-task' : ''}`}
                  onClick={() => setSelected(date)}
                >
                  {day}
                  {hasDots && (
                    <span className="rp-dots-row">
                      {dots.map((c, di) => (
                        <span key={di} className="rp-dot" style={{ background: isSel ? 'rgba(255,255,255,0.8)' : c }} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rp-tasks">
          <div className="rp-tasks-header">
            <span className="rp-tasks-title">
              {sameDay(selected, today)
                ? 'Hoje'
                : selected.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
            <span className="rp-tasks-count">
              {dayTasks.length} atividade{dayTasks.length !== 1 ? 's' : ''}
            </span>
          </div>
          {dayTasks.length === 0 ? (
            <p className="rp-tasks-empty">Sem atividades</p>
          ) : (
            <ul className="rp-task-list">
              {dayTasks.map((task) => (
                <li
                  key={task.id}
                  className={`rp-task-item ${task.priority?.toLowerCase() === 'alta' ? 'priority-high' : task.priority?.toLowerCase() === 'baixa' ? 'priority-low' : 'priority-medium'}`}
                  onClick={() => setQuickTask(task)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                    <span className="rp-task-name">{task.activity}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2, opacity: 0.5 }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                  {task.responsible && <span className="rp-task-resp">{task.responsible}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {quickTask && <TaskQuickModal task={quickTask} onClose={() => setQuickTask(null)} />}
    </>
  );
}
