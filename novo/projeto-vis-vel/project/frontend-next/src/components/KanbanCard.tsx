'use client';

import { useDraggable } from '@dnd-kit/core';
import { Trash2, Flag, Clock, Calendar, Check } from 'lucide-react';
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
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}: {
  task: Task;
  onView: (t: Task) => void;
  onDelete: (id: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: selectionMode,
  });

  let coResponsibles: string[] = [];
  try { coResponsibles = task.co_responsibles ? JSON.parse(task.co_responsibles) : []; } catch { coResponsibles = []; }
  const allAvatars = task.responsible ? [task.responsible, ...coResponsibles] : coResponsibles;

  return (
    <div
      ref={setNodeRef}
      className={`kanban-card ${priorityClass(task.priority)}`}
      style={{
        position: 'relative',
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
      {selectionMode && (
        <div
          style={{
            position: 'absolute', top: 10, left: 10, zIndex: 2,
            width: 18, height: 18, borderRadius: 4,
            border: `2px solid ${isSelected ? 'var(--primary)' : '#c1c7d0'}`,
            background: isSelected ? 'var(--primary)' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', flexShrink: 0,
          }}
        >
          {isSelected && <Check size={11} color="#fff" strokeWidth={3} />}
        </div>
      )}
      <div className="card-content"
        style={{ paddingLeft: selectionMode ? 34 : undefined }}
        onClick={() => { if (isDragging) return; selectionMode ? onToggleSelect?.(task.id) : onView(task); }}>
        <div className="card-title-row">
          <p className="card-title">{task.activity}</p>
          <button
            className="delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            onPointerDown={(e) => e.stopPropagation()}
            title="Excluir"
          >
            <Trash2 size={13} />
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
          <Flag size={11} />
          SIA-{task.id.slice(0, 8)}
        </span>
        <div className="card-footer-right">
          {task.deadline && (() => {
            const today = new Date().toISOString().split('T')[0];
            const soon = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
            const isDone = task.status_group === 'done';
            const overdue = !isDone && task.deadline < today;
            const dueSoon = !isDone && !overdue && task.deadline <= soon;
            const color = overdue ? '#de350b' : dueSoon ? '#b45309' : undefined;
            return (
              <span className="card-date" style={{ color, fontWeight: (overdue || dueSoon) ? 700 : undefined }} title={overdue ? 'Atrasado' : dueSoon ? 'Vence em breve' : 'Prazo'}>
                <Clock size={11} />
                {task.deadline}
              </span>
            );
          })()}
          {task.date && !task.deadline && (
            <span className="card-date">
              <Calendar size={11} />
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
