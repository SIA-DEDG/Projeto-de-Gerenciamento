'use client';

import { useDraggable } from '@dnd-kit/core';
import { avatarColor, initials } from '@/lib/utils';
import type { Task } from '@/types';

const MAX_AVATARS = 3;

function priorityClass(priority: string) {
  const normalizedPriority = priority?.toLowerCase();
  if (normalizedPriority === 'alta')  return 'priority-alta';
  if (normalizedPriority === 'baixa') return 'priority-baixa';
  return 'priority-media';
}

export default function KanbanCard({
  task,
  onView,
  onDelete,
}: {
  task: Task;
  onView: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  let coResponsibles: string[] = [];
  try { coResponsibles = task.co_responsibles ? JSON.parse(task.co_responsibles) : []; } catch { coResponsibles = []; }
  const allAvatars = task.responsible ? [task.responsible, ...coResponsibles] : coResponsibles;

  return (
    <div
      ref={setNodeRef}
      className={`kanban-card ${priorityClass(task.priority)}`}
      style={{
        transform: transform
          ? isDragging
            ? `translate3d(${transform.x}px,${transform.y}px,0) rotate(2deg) scale(1.04)`
            : `translate3d(${transform.x}px,${transform.y}px,0)`
          : undefined,
        opacity: isDragging ? 0.92 : 1,
        zIndex: isDragging ? 999 : undefined,
        boxShadow: isDragging
          ? '0 20px 48px rgba(3,78,162,0.28), 0 4px 12px rgba(0,0,0,0.15)'
          : undefined,
        transition: isDragging ? 'none' : 'box-shadow 0.2s ease, transform 0.15s ease',
      }}
      {...listeners}
      {...attributes}
    >
      <div className="card-content" onClick={() => !isDragging && onView(task)}>
        <div className="card-title-row">
          <p className="card-title">{task.activity}</p>
          <button
            className="delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            onPointerDown={(e) => e.stopPropagation()}
            title="Excluir"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>

        <div className="card-meta-row">
          {task.category && (
            <span className={`jira-badge jira-badge-${task.badge_color}`}>
              {task.category}
            </span>
          )}
          {task.priority && (
            <span className={`priority-chip priority-chip-${priorityClass(task.priority).replace('priority-', '')}`}>
              {task.priority}
            </span>
          )}
        </div>
      </div>

      <div className="card-footer">
        <span className="issue-key">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
          SIA-{task.id.slice(0, 8)}
        </span>
        <div className="card-footer-right">
          {task.deadline && (() => {
            const today = new Date().toISOString().split('T')[0];
            const overdue = task.status_group !== 'done' && task.deadline < today;
            return (
              <span className="card-date" style={{ color: overdue ? '#de350b' : undefined }} title="Prazo de finalização">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {task.deadline}
              </span>
            );
          })()}
          {task.date && !task.deadline && (
            <span className="card-date">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {task.date}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {allAvatars.slice(0, MAX_AVATARS).map((name, i) => (
              <div
                key={name}
                className="jira-avatar"
                style={{ background: avatarColor(name), width: 24, height: 24, fontSize: '0.6rem', flexShrink: 0, marginLeft: i > 0 ? -6 : 0, border: '2px solid #fff', zIndex: MAX_AVATARS - i }}
                title={name}
              >
                {initials(name)}
              </div>
            ))}
            {allAvatars.length > MAX_AVATARS && (
              <div
                className="jira-avatar"
                style={{ background: '#6b778c', width: 24, height: 24, fontSize: '0.58rem', flexShrink: 0, marginLeft: -6, border: '2px solid #fff' }}
                title={allAvatars.slice(MAX_AVATARS).join(', ')}
              >
                +{allAvatars.length - MAX_AVATARS}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
