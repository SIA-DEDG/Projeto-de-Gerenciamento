'use client';

import type { Task } from '@/types';
import { statusClass } from '@/lib/utils';

interface Props {
  open: boolean;
  task: Task | null;
  projectName?: string;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

const LABEL = 'font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b778c;margin-bottom:4px';

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b778c', marginBottom: '4px' }}>
      {children}
    </div>
  );
}

function MetaValue({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.88rem', color: '#172b4d', fontWeight: 500 }}>
      {children}
    </div>
  );
}

export default function TaskDetailModal({ open, task, projectName, onClose, onEdit, onDelete }: Props) {
  if (!open || !task) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-card" style={{ maxWidth: '540px' }}>
        {/* Header */}
        <div className="modal-head" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b778c', marginBottom: '6px' }}>
              SIA-{task.id}
            </div>
            <h3 style={{ fontSize: '1.05rem', lineHeight: 1.4, fontWeight: 700, color: '#172b4d' }}>
              {task.activity}
            </h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status */}
          <div>
            <MetaLabel>Status</MetaLabel>
            <span className={statusClass(task.status_group)}>{task.status}</span>
          </div>

          {/* Description */}
          {task.description ? (
            <div>
              <MetaLabel>Descrição</MetaLabel>
              <p style={{ fontSize: '0.9rem', color: '#344563', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, padding: '10px 12px', background: '#f4f5f7', borderRadius: '4px' }}>
                {task.description}
              </p>
            </div>
          ) : (
            <div>
              <MetaLabel>Descrição</MetaLabel>
              <p style={{ fontSize: '0.85rem', color: '#a5adba', fontStyle: 'italic', margin: 0 }}>Sem descrição.</p>
            </div>
          )}

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {projectName && (
              <div>
                <MetaLabel>Projeto</MetaLabel>
                <MetaValue>{projectName}</MetaValue>
              </div>
            )}
            {task.responsible && (
              <div>
                <MetaLabel>Responsável</MetaLabel>
                <MetaValue>{task.responsible}</MetaValue>
              </div>
            )}
            {task.date && (
              <div>
                <MetaLabel>Data</MetaLabel>
                <MetaValue>{task.date}</MetaValue>
              </div>
            )}
            {task.priority && (
              <div>
                <MetaLabel>Prioridade</MetaLabel>
                <MetaValue>{task.priority}</MetaValue>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-light)' }}>
          <button
            type="button"
            className="evidence-btn"
            style={{ background: '#ffebe6', borderColor: '#de350b', color: '#de350b' }}
            onClick={() => { onClose(); onDelete(task.id); }}
          >
            Excluir
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn-secondary" onClick={onClose}>Fechar</button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => { onClose(); onEdit(task); }}
          >
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}
