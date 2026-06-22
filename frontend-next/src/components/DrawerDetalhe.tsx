'use client';

import { X, Pencil, Trash2, ChevronRight } from 'lucide-react';
import type { Task } from '@/types';
import { avatarColor, initials, statusGroupLabel } from '@/lib/utils';

interface Props {
  task: Task;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onAdvanceStatus?: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  Alta: 'var(--red)',
  Média: 'var(--gold-t)',
  Baixa: 'var(--green-t)',
};

const STATUS_COLORS: Record<string, string> = {
  pending:    'var(--s-pending)',
  in_progress:'var(--s-progress)',
  review:     'var(--s-review)',
  done:       'var(--s-done)',
};

const NEXT_STATUS: Record<string, string> = {
  pending:     'in_progress',
  in_progress: 'review',
  review:      'done',
};

function formatDate(s: string | null | undefined) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function parseNames(json: string | null | undefined): string[] {
  if (!json) return [];
  try { return JSON.parse(json) as string[]; } catch { return []; }
}

export default function DrawerDetalhe({ task, onClose, onEdit, onDelete, onAdvanceStatus }: Props) {
  const coResponsibles = parseNames(task.co_responsibles);
  const nextStatus = NEXT_STATUS[task.status_group];
  const statusColor = STATUS_COLORS[task.status_group] ?? 'var(--text-3)';

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        {/* Header */}
        <div className="drawer-header">
          <h2 className="drawer-title">{task.activity}</h2>
          <button className="drawer-close" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* Status + prioridade em linha */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div className="drawer-field">
              <span className="drawer-field-label">Status</span>
              <span
                className="mono"
                style={{
                  fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  color: statusColor,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0, display: 'inline-block' }} />
                {statusGroupLabel(task.status_group)}
              </span>
            </div>
            <div className="drawer-field">
              <span className="drawer-field-label">Prioridade</span>
              <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: PRIORITY_COLORS[task.priority] ?? 'var(--text-2)' }}>
                {task.priority}
              </span>
            </div>
          </div>

          <div className="drawer-divider" />

          {/* Categoria + Projeto */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div className="drawer-field">
              <span className="drawer-field-label">Categoria</span>
              <span className="drawer-field-value">{task.category || '—'}</span>
            </div>
            {task.project_id && (
              <div className="drawer-field">
                <span className="drawer-field-label">Projeto</span>
                <span className="drawer-field-value">{task.project_id}</span>
              </div>
            )}
          </div>

          {/* Prazo */}
          <div className="drawer-field">
            <span className="drawer-field-label">Prazo</span>
            <span className="drawer-field-value mono" style={{ fontSize: '0.82rem' }}>
              {formatDate(task.deadline)}
            </span>
          </div>

          {/* Criado em */}
          <div className="drawer-field">
            <span className="drawer-field-label">Criado em</span>
            <span className="drawer-field-value mono" style={{ fontSize: '0.82rem' }}>
              {formatDate(task.created_at.slice(0,10))}
            </span>
          </div>

          <div className="drawer-divider" />

          {/* Responsável */}
          <div className="drawer-field">
            <span className="drawer-field-label">Responsável</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <div className="task-avatar" style={{ background: avatarColor(task.responsible) }}>
                {initials(task.responsible)}
              </div>
              <span className="drawer-field-value">{task.responsible}</span>
            </div>
          </div>

          {/* Co-responsáveis */}
          {coResponsibles.length > 0 && (
            <div className="drawer-field">
              <span className="drawer-field-label">Co-responsáveis</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {coResponsibles.map((name) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div className="task-avatar" style={{ background: avatarColor(name) }}>{initials(name)}</div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Descrição */}
          {task.description && (
            <>
              <div className="drawer-divider" />
              <div className="drawer-field">
                <span className="drawer-field-label">Descrição</span>
                <div className="drawer-field-value rich-content" dangerouslySetInnerHTML={{ __html: task.description }} />
              </div>
            </>
          )}

          {/* Colaboradores externos */}
          {task.external_collaborators && (
            <div className="drawer-field">
              <span className="drawer-field-label">Colaboradores externos</span>
              <span className="drawer-field-value" style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>
                {task.external_collaborators}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          {nextStatus && onAdvanceStatus && (
            <button className="btn btn-primary btn-sm" onClick={onAdvanceStatus} style={{ flex: 1 }}>
              <ChevronRight size={14} />
              Avançar para {statusGroupLabel(nextStatus)}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(task)} title="Editar">
            <Pencil size={14} />
            Editar
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(task.id)} title="Excluir">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
