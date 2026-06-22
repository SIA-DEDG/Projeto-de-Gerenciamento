'use client';

import { useDraggable } from '@dnd-kit/core';
import { Check } from 'lucide-react';
import { avatarColor, initials } from '@/lib/utils';
import type { Task } from '@/types';

/* Cores do spine por status — conforme Tasks SIA.dc.html */
const SPINE_COLOR: Record<string, string> = {
  pending:    '#9aa1ac',
  in_progress:'#034EA2',
  review:     '#E0A92E',
  done:       '#1B8A4B',
};

/* Cor do texto de prioridade */
const PRIO_COLOR: Record<string, string> = {
  Alta:  '#b42318',
  Média: '#A87A00',
  Baixa: '#157F3C',
};

/* Cor de prazo */
function dueColor(deadline: string | null | undefined, isDone: boolean): string {
  if (!deadline || isDone) return 'var(--text-3)';
  const today = new Date().toISOString().split('T')[0];
  const soon  = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  if (deadline < today) return '#b42318';
  if (deadline <= soon) return '#A87A00';
  return 'var(--text-3)';
}

const MAX_AVATARS = 3;

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

  const spineColor = SPINE_COLOR[task.status_group] ?? '#9aa1ac';
  const isDone = task.status_group === 'done';
  const dc = dueColor(task.deadline, isDone);

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
        paddingLeft: 26,  /* espaço para o spine */
        paddingRight: 22,
        paddingTop: 15,
        paddingBottom: 15,
        cursor: selectionMode ? 'pointer' : 'grab',
        borderTop: '1px solid var(--line-2)',
        background: isSelected ? 'var(--surface-2)' : 'var(--surface)',
        transition: 'background 0.14s, box-shadow 0.16s, transform 0.16s',
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
          (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(7,22,45,0.09)';
          (e.currentTarget as HTMLElement).style.transform = transform
            ? `translate3d(${transform.x}px,${transform.y}px,0) translateY(-1px)`
            : 'translateY(-1px)';
          (e.currentTarget as HTMLElement).style.zIndex = '2';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging && !isSelected) {
          (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
          (e.currentTarget as HTMLElement).style.boxShadow = '';
          (e.currentTarget as HTMLElement).style.transform = '';
          (e.currentTarget as HTMLElement).style.zIndex = '';
        }
      }}
    >
      {/* Spine lateral colorido */}
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: spineColor }} />

      {/* Checkbox de seleção */}
      {selectionMode && (
        <div style={{ position: 'absolute', left: 8, top: 15, width: 14, height: 14, borderRadius: 2, border: `1.5px solid ${isSelected ? 'var(--blue)' : 'rgba(255,255,255,0.3)'}`, background: isSelected ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isSelected && <Check size={9} color="#fff" strokeWidth={3} />}
        </div>
      )}

      {/* Linha 1: categoria · prioridade */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          {task.category || 'Sem categoria'}
        </span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: PRIO_COLOR[task.priority] ?? 'var(--text-3)' }}>
          {task.priority || 'Média'}
        </span>
      </div>

      {/* Título da atividade */}
      <p style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, letterSpacing: '-0.1px', margin: 0 }}>
        {task.activity}
      </p>

      {/* Linha 3: projeto + avatares */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: '0.74rem', minWidth: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
            {task.category || '—'}
          </span>
        </div>
        {allAvatars.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {allAvatars.slice(0, MAX_AVATARS).map((name, i) => (
              <div
                key={name}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: avatarColor(name),
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.62rem', fontWeight: 600, fontFamily: 'var(--mono)',
                  marginLeft: i > 0 ? -7 : 0,
                  border: '2px solid var(--surface)',
                  flexShrink: 0, zIndex: MAX_AVATARS - i,
                }}
                title={name}
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

      {/* Prazo */}
      {task.deadline && (
        <div className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 11, fontSize: '0.66rem', fontWeight: 500, letterSpacing: '0.5px', color: dc }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {task.deadline}
        </div>
      )}
    </div>
  );
}
