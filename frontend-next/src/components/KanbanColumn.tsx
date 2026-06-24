'use client';

import { useState, useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Ellipsis, Plus } from 'lucide-react';
import KanbanCard from './KanbanCard';
import type { Task, StatusGroup, Project } from '@/types';

export interface KanbanColumnDef {
  id: StatusGroup;
  title: string;
  color: string; // CSS custom property, ex: 'var(--s-pending)'
}

interface KanbanColumnProps {
  column: KanbanColumnDef;
  tasks: Task[];
  projects: Project[];
  onAddCard: (statusGroup: StatusGroup) => void;
  onViewCard: (task: Task) => void;
  onDeleteCard: (taskId: string) => void;
  isSelecting: boolean;
  selectedTaskIds: Set<string>;
  onToggleSelect: (taskId: string) => void;
  onStartSelect: () => void;
}

const COLUMN_TINT_COLOR: Record<StatusGroup, string> = {
  pending:     'rgba(154,161,172,0.12)',
  in_progress: 'rgba(3,78,162,0.1)',
  review:      'rgba(224,169,46,0.1)',
  done:        'rgba(27,138,75,0.1)',
};

const COLUMN_TITLE_COLOR: Record<StatusGroup, string> = {
  pending:     'var(--text-3)',
  in_progress: '#034EA2',
  review:      '#A87A00',
  done:        '#157F3C',
};

export default function KanbanColumn({
  column,
  tasks,
  projects,
  onAddCard,
  onViewCard,
  onDeleteCard,
  isSelecting,
  selectedTaskIds,
  onToggleSelect,
  onStartSelect,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const tintColor = COLUMN_TINT_COLOR[column.id];
  const titleColor = COLUMN_TITLE_COLOR[column.id];

  return (
    <div
      ref={setNodeRef}
      style={{
        borderRight: '1px solid var(--line-1)',
        borderTop: `2px solid ${column.color}`,
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: isOver && !isSelecting ? 'var(--surface-2)' : 'var(--surface)',
        transition: 'background 0.12s',
      }}
    >
      {/* Header da coluna — sticky */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '14px 20px', position: 'sticky', top: 0,
        background: 'var(--surface)', zIndex: 1,
        borderBottom: '1px solid var(--line-2)',
      }}>
        <span style={{
          width: 9, height: 9, borderRadius: 2,
          background: column.color,
          boxShadow: `0 0 0 3px ${tintColor}`,
          flexShrink: 0,
        }} />
        <span className="mono" style={{
          fontWeight: 600, fontSize: '0.72rem',
          color: titleColor, letterSpacing: '1.2px', textTransform: 'uppercase',
        }}>
          {column.title}
        </span>
        <span className="mono" style={{
          fontSize: '0.68rem', fontWeight: 600, color: titleColor,
          background: tintColor, padding: '1px 8px', borderRadius: 3, marginLeft: 2,
        }}>
          {tasks.length}
        </span>

        <div style={{ position: 'relative', marginLeft: 'auto' }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            title="Opções"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-3)', display: 'flex', alignItems: 'center',
              padding: 4, borderRadius: 3,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'none';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-3)';
            }}
          >
            <Ellipsis size={14} />
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 100, minWidth: 160, padding: '2px 0',
            }}>
              <button
                onClick={() => { setMenuOpen(false); onStartSelect(); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text)',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                Selecionar itens
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div style={{ flex: 1 }}>
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            projectName={projects.find((p) => p.id === task.project_id)?.name}
            onView={onViewCard}
            onDelete={onDeleteCard}
            selectionMode={isSelecting}
            isSelected={selectedTaskIds.has(task.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
        {!isSelecting && (
          <button
            onClick={() => onAddCard(column.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              width: '100%', padding: '13px 24px', border: 'none',
              borderTop: '1px solid var(--line-2)', background: 'none',
              color: 'var(--text-3)', fontSize: '0.78rem', fontWeight: 500,
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = '#034EA2';
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-3)';
              (e.currentTarget as HTMLElement).style.background = 'none';
            }}
          >
            <Plus size={13} strokeWidth={2} />
            Adicionar
          </button>
        )}
      </div>
    </div>
  );
}
