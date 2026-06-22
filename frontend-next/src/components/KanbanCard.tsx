'use client';

import { useDraggable } from '@dnd-kit/core';
import { Check } from 'lucide-react';
import { avatarColor, initials } from '@/lib/utils';
import type { Task } from '@/types';

const MAX_AVATARS = 3;

const STATUS_COLORS: Record<string, string> = {
  pending:    'var(--s-pending)',
  in_progress:'var(--s-progress)',
  review:     'var(--s-review)',
  done:       'var(--s-done)',
};

const PRIORITY_COLOR: Record<string, string> = {
  Alta:  'var(--red)',
  Média: 'var(--gold-t)',
  Baixa: 'var(--green-t)',
};

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

  const today = new Date().toISOString().split('T')[0];
  const soon  = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  const isDone   = task.status_group === 'done';
  const overdue  = !isDone && !!task.deadline && task.deadline < today;
  const dueSoon  = !isDone && !overdue && !!task.deadline && task.deadline <= soon;

  function handleClick() {
    if (isDragging) return;
    if (selectionMode) { onToggleSelect?.(task.id); return; }
    onView(task);
  }

  return (
    <div
      ref={setNodeRef}
      className={`kanban-row status-${task.status_group}${isDragging ? ' dragging' : ''}`}
      style={{
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : undefined,
      }}
      onClick={handleClick}
      {...listeners}
      {...attributes}
    >
      {/* Checkbox de seleção */}
      {selectionMode && (
        <div className="kanban-row-check">
          <div style={{
            width: 16, height: 16, borderRadius: 2,
            border: `1.5px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
            background: isSelected ? 'var(--blue)' : 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
          </div>
        </div>
      )}

      {/* Corpo */}
      <div className="kanban-row-body">
        <div className="kanban-row-title">{task.activity}</div>
        <div className="kanban-row-meta">
          {task.category && (
            <span className="kanban-row-category">{task.category}</span>
          )}
          {task.priority && (
            <span className="kanban-row-priority" style={{ color: PRIORITY_COLOR[task.priority] ?? 'var(--text-3)' }}>
              {task.priority}
            </span>
          )}
          {task.deadline && (
            <span className={`kanban-row-date${overdue ? ' overdue' : ''}`}>
              {overdue ? '⚠ ' : dueSoon ? '⏰ ' : ''}{task.deadline}
            </span>
          )}
        </div>
      </div>

      {/* Avatares à direita */}
      <div className="kanban-row-right">
        <div className="avatar-group">
          {allAvatars.slice(0, MAX_AVATARS).map((name, i) => (
            <div
              key={name}
              className="task-avatar"
              style={{ background: avatarColor(name), zIndex: MAX_AVATARS - i }}
              title={name}
            >
              {initials(name)}
            </div>
          ))}
          {allAvatars.length > MAX_AVATARS && (
            <div
              className="task-avatar"
              style={{ background: 'var(--text-3)' }}
              title={allAvatars.slice(MAX_AVATARS).join(', ')}
            >
              +{allAvatars.length - MAX_AVATARS}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
