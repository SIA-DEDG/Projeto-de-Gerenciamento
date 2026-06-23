'use client';

import { useDraggable } from '@dnd-kit/core';
import { Check, Folder, Clock } from 'lucide-react';
import { initials } from '@/lib/utils';
import type { Task } from '@/types';

/* Spine colorido por status */
const SPINE_COLOR: Record<string, string> = {
  pending: '#9aa1ac',
  in_progress: '#034EA2',
  review: '#E0A92E',
  done: '#1B8A4B',
};

/* Cor de prioridade conforme design: Alta=azul, Média=cinza, Baixa=cinza-claro */
const PRIO_COLOR: Record<string, string> = {
  Alta: '#034EA2',
  Média: 'var(--text-2)',
  Baixa: 'var(--text-3)',
};

/* Texto e cor do prazo (human-readable) */
function dueText(deadline: string | null | undefined, isDone: boolean): { text: string; color: string } | null {
  if (!deadline || isDone) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + 'T00:00:00');
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { text: `Atrasada ${Math.abs(diffDays)}d`, color: '#b42318' };
  if (diffDays === 0) return { text: 'Vence hoje', color: '#A87A00' };
  if (diffDays === 1) return { text: 'Vence amanhã', color: '#A87A00' };
  if (diffDays <= 7) return { text: `Em ${diffDays} dias`, color: 'var(--text-3)' };
  const [, mm, dd] = deadline.split('-');
  return { text: `${dd}/${mm}`, color: 'var(--text-3)' };
}

const MAX_AVATARS = 3;
const AVATAR_BG = '#072f63'; /* Design: todos os avatares no kanban usam navy fixo */

export default function KanbanCard({
  task,
  projectName,
  onView,
  onDelete,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}: {
  task: Task;
  projectName?: string;
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

  const spineColor = SPINE_COLOR[task.status_group] ?? '#9aa1ac';
  const isDone = task.status_group === 'done';
  const due = dueText(task.deadline, isDone);

  function handleClick() {
    if (isDragging) return;
    if (selectionMode) { onToggleSelect?.(task.id); return; }
    onView(task);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'relative',
        paddingLeft: 26,
        paddingRight: 22,
        paddingTop: 15,
        paddingBottom: 15,
        cursor: selectionMode ? 'pointer' : 'grab',
        borderTop: '1px solid var(--line-2)',
        background: isSelected ? 'var(--surface-2)' : 'var(--surface)',
        transition: isDragging ? 'none' : 'background 0.14s, box-shadow 0.16s',
        transform: transform
          ? isDragging
            ? `translate3d(${transform.x}px,${transform.y}px,0) rotate(1deg) scale(1.02)`
            : `translate3d(${transform.x}px,${transform.y}px,0)`
          : undefined,
        opacity: isDragging ? 0.85 : 1,
        zIndex: isDragging ? 999 : undefined,
        boxShadow: isDragging ? '0 8px 20px rgba(7,22,45,0.09)' : undefined,
      }}
      onClick={handleClick}
      {...(selectionMode ? {} : listeners)}
      {...(selectionMode ? {} : attributes)}
      onMouseEnter={(e) => {
        if (!isDragging && !isSelected) {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--surface-2)';
          el.style.boxShadow = '0 8px 20px rgba(7,22,45,0.09)';
          el.style.zIndex = '2';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging && !isSelected) {
          const el = e.currentTarget as HTMLElement;
          el.style.background = 'var(--surface)';
          el.style.boxShadow = '';
          el.style.zIndex = '';
        }
      }}
    >
      {/* Spine lateral */}
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: spineColor }} />

      {/* Checkbox de seleção */}
      {selectionMode && (
        <div style={{ position: 'absolute', left: 8, top: 15, width: 14, height: 14, borderRadius: 2, border: `1.5px solid ${isSelected ? 'var(--blue)' : 'rgba(0,0,0,0.2)'}`, background: isSelected ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isSelected && <Check size={9} color="#fff" strokeWidth={3} />}
        </div>
      )}

      {/* Linha 1: CATEGORIA · PRIORIDADE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          {task.category || 'Sem categoria'}
        </span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: PRIO_COLOR[task.priority] ?? 'var(--text-3)' }}>
          {task.priority || 'Média'}
        </span>
      </div>

      {/* Título */}
      <p style={{
        fontSize: '0.92rem', 
        fontWeight: 500, 
        color: 'var(--text)', 
        lineHeight: 1.4, 
        letterSpacing: '-0.1px',
        margin: 0, 
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}>
        {task.activity}
      </p>

      {/* Linha 3: ícone-pasta + nome-projeto | avatares */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 }}>
        {(projectName || task.category) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', fontSize: '0.72rem', minWidth: 0, flex: 1 }}>
            <Folder size={12} strokeWidth={1.8} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
              {projectName || task.category}
            </span>
          </div>
        )}
        {allAvatars.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {allAvatars.slice(0, MAX_AVATARS).map((name, i) => (
              <div
                key={name + i}
                title={name}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: AVATAR_BG,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 600, fontFamily: 'var(--mono)',
                  marginLeft: i > 0 ? -7 : 0,
                  border: '2px solid var(--surface)',
                  flexShrink: 0, zIndex: MAX_AVATARS - i,
                }}
              >
                {initials(name)}
              </div>
            ))}
            {allAvatars.length > MAX_AVATARS && (
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--text-3)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 600, marginLeft: -7, border: '2px solid var(--surface)', flexShrink: 0 }}>
                +{allAvatars.length - MAX_AVATARS}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prazo (human-readable) */}
      {due && (
        <div className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 11, fontSize: '0.66rem', fontWeight: 500, letterSpacing: '0.4px', color: due.color }}>
          <Clock size={11} strokeWidth={2} />
          {due.text}
        </div>
      )}
    </div>
  );
}
