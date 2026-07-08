'use client';

import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Check, Folder, Clock, Ellipsis, Archive, Trash2, Pin } from 'lucide-react';
import { initials, STATUS_COLORS } from '@/lib/utils';
import type { Task } from '@/types';

const PRIO_COLOR: Record<string, string> = {
  Alta:  '#b42318',
  Média: '#A87A00',
  Baixa: '#157F3C',
};

const PRIO_BG: Record<string, string> = {
  Alta:  'rgba(180,35,24,0.08)',
  Média: 'rgba(168,122,0,0.08)',
  Baixa: 'rgba(21,127,60,0.08)',
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

function KanbanCard({
  task,
  projectName,
  onView,
  onDelete,
  onArchive,
  onTogglePin,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}: {
  task: Task;
  projectName?: string;
  onView: (t: Task) => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: selectionMode,
  });

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const allAvatars = useMemo(() => {
    let coResponsibles: string[] = [];
    try { coResponsibles = task.co_responsibles ? JSON.parse(task.co_responsibles) : []; } catch { coResponsibles = []; }
    return task.responsible ? [task.responsible, ...coResponsibles] : coResponsibles;
  }, [task.co_responsibles, task.responsible]);

  const spineColor = STATUS_COLORS[task.status_group] ?? '#9aa1ac';
  const isDone = task.status_group === 'done';
  const due = dueText(task.deadline, isDone);
  const prio = task.priority || 'Média';

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
        paddingRight: 10,
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

      {/* Pin de fixar — símbolo sempre visível no canto superior esquerdo; fica dourado quando fixada.
          Fixar leva a atividade para o topo da coluna. */}
      {!selectionMode && onTogglePin && (
        <button
          type="button"
          title={task.pinned ? 'Desafixar atividade' : 'Fixar atividade no topo'}
          aria-pressed={!!task.pinned}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onTogglePin(task.id, !task.pinned); }}
          style={{
            position: 'absolute', top: 8, left: 2, width: 20, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', borderRadius: 5, padding: 0, cursor: 'pointer', zIndex: 3,
            background: 'transparent',
            transition: 'background 0.12s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--line-1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Pin
            size={17}
            strokeWidth={2.25}
            fill={task.pinned ? '#E0A92E' : 'none'}
            color={task.pinned ? '#E0A92E' : 'var(--text-3)'}
          />
        </button>
      )}

      {/* Checkbox de seleção */}
      {selectionMode && (
        <div style={{ position: 'absolute', left: 8, top: 15, width: 14, height: 14, borderRadius: 2, border: `1.5px solid ${isSelected ? 'var(--blue)' : 'rgba(0,0,0,0.2)'}`, background: isSelected ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isSelected && <Check size={9} color="#fff" strokeWidth={3} />}
        </div>
      )}

      {/* Botão "..." + menu */}
      {!selectionMode && (
        <div
          ref={menuRef}
          style={{ position: 'absolute', top: 10, right: 8, zIndex: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            title="Mais opções"
            aria-label="Mais opções"
            onClick={() => setMenuOpen((v) => !v)}
            style={{ width: 24, height: 24, borderRadius: 3, border: 'none', background: 'transparent', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--line-1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Ellipsis size={14} />
          </button>

          {menuOpen && (
            <div style={{ position: 'absolute', top: 28, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 140, zIndex: 300, overflow: 'hidden' }}>
              {onArchive && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onArchive(task.id); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', border: 'none', background: 'transparent', color: 'var(--text-2)', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Archive size={13} style={{ color: 'var(--text-3)' }} />
                  Arquivar
                </button>
              )}
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onDelete(task.id); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', border: 'none', background: 'transparent', color: '#b42318', fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(180,35,24,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Trash2 size={13} />
                Excluir
              </button>
            </div>
          )}
        </div>
      )}

      {/* Linha 1: CATEGORIA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, paddingRight: 20 }}>
        <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.category || 'Sem categoria'}
        </span>
      </div>

      {/* Título */}
      <p style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, letterSpacing: '-0.1px', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', paddingRight: 20 }}>
        {task.activity}
      </p>

      {/* Linha 3: projeto | avatares */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 }}>
        {projectName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', fontSize: '0.72rem', minWidth: 0, flex: 1 }}>
            <Folder size={12} strokeWidth={1.8} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
              {projectName}
            </span>
          </div>
        )}
        {allAvatars.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 'auto' }}>
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
              <div title={allAvatars.slice(MAX_AVATARS).join(', ')} style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--text-3)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 600, marginLeft: -7, border: '2px solid var(--surface)', flexShrink: 0 }}>
                +{allAvatars.length - MAX_AVATARS}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rodapé: prazo + prioridade */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 }}>
        {due ? (
          <div className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.66rem', fontWeight: 500, letterSpacing: '0.4px', color: due.color }}>
            <Clock size={11} strokeWidth={2} />
            {due.text}
          </div>
        ) : <span />}

        <span style={{
          display: 'inline-flex', alignItems: 'center',
          fontSize: '0.62rem', fontWeight: 600, fontFamily: 'var(--mono)',
          letterSpacing: '0.5px', textTransform: 'uppercase',
          color: PRIO_COLOR[prio] ?? 'var(--text-3)',
          background: PRIO_BG[prio] ?? 'transparent',
          padding: '2px 7px', borderRadius: 3,
        }}>
          {prio}
        </span>
      </div>
    </div>
  );
}

export default memo(KanbanCard);
