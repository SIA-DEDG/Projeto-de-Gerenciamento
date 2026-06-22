'use client';

import { X, Archive } from 'lucide-react';
import type { Task } from '@/types';
import { avatarColor, initials, statusGroupLabel } from '@/lib/utils';

interface Props {
  task: Task;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onAdvanceStatus?: () => void;
  onArchive?: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  Alta:  '#b42318',
  Média: '#A87A00',
  Baixa: '#157F3C',
};

const STATUS_COLORS: Record<string, string> = {
  pending:     '#9aa1ac',
  in_progress: '#034EA2',
  review:      '#E0A92E',
  done:        '#1B8A4B',
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

function isOverdue(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono" style={{
      fontSize: '0.66rem',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '1px',
      color: 'var(--text-3)',
      marginTop: 26,
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '13px 0',
      borderBottom: '1px solid var(--line-2)',
    }}>
      <span className="mono" style={{
        width: 110,
        flexShrink: 0,
        fontSize: '0.66rem',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        color: 'var(--text-3)',
      }}>
        {label}
      </span>
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

export default function DrawerDetalhe({ task, onClose, onEdit, onDelete, onAdvanceStatus, onArchive }: Props) {
  const coResponsibles = parseNames(task.co_responsibles);
  const nextStatus = NEXT_STATUS[task.status_group];
  const statusColor = STATUS_COLORS[task.status_group] ?? '#9aa1ac';
  const prioColor = PRIORITY_COLORS[task.priority] ?? 'var(--text-2)';
  const overdue = isOverdue(task.deadline);
  const isArchived = task.status === 'Arquivada';

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(7,22,45,.28)',
          zIndex: 50,
          animation: 'overlayIn 0.2s ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 440,
        maxWidth: '100vw',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--line-1)',
        zIndex: 51,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight .24s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
      }}>

        {/* Sticky header */}
        <div style={{
          padding: '22px 28px',
          borderBottom: '1px solid var(--line-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span className="mono" style={{
            fontSize: '0.7rem',
            fontWeight: 500,
            color: 'var(--text-3)',
            letterSpacing: '1px',
          }}>
            {task.id.slice(0, 8).toUpperCase()}
          </span>
          <button
            onClick={onClose}
            title="Fechar"
            style={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 3,
              border: '1px solid var(--border)',
              background: 'none',
              color: 'var(--text-3)',
              cursor: 'pointer',
              transition: 'background 0.12s, color 0.12s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'none';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)';
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '26px 28px' }}>

          {/* Categoria · Prioridade */}
          <div className="mono" style={{
            fontSize: '0.62rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            color: 'var(--text-3)',
            letterSpacing: '0.8px',
          }}>
            {task.category || '—'}
            {task.priority && (
              <>
                <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
                <span style={{ color: prioColor }}>{task.priority}</span>
              </>
            )}
          </div>

          {/* Título */}
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: 600,
            letterSpacing: '-0.5px',
            color: 'var(--text)',
            marginTop: 12,
            lineHeight: 1.3,
          }}>
            {task.activity}
          </h2>

          {/* Info rows */}
          <div style={{ borderTop: '1px solid var(--line-1)', marginTop: 24 }}>
            <InfoRow label="Status">
              <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 500, color: statusColor }}>
                {statusGroupLabel(task.status_group)}
              </span>
            </InfoRow>

            {task.project_id && (
              <InfoRow label="Projeto">
                <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)' }}>
                  {task.project_id}
                </span>
              </InfoRow>
            )}

            <InfoRow label="Prazo">
              <span className="mono" style={{
                fontSize: '0.82rem',
                fontWeight: 500,
                color: overdue ? '#b42318' : 'var(--text)',
              }}>
                {formatDate(task.deadline)}
              </span>
            </InfoRow>

            <InfoRow label="Criado em">
              <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)' }}>
                {formatDate(task.created_at.slice(0, 10))}
              </span>
            </InfoRow>
          </div>

          {/* Responsáveis */}
          <SectionTitle>Responsáveis</SectionTitle>

          {/* Responsável principal */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 0',
            borderBottom: '1px solid var(--line-2)',
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: avatarColor(task.responsible),
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--mono)',
              fontSize: '0.68rem',
              fontWeight: 700,
              flexShrink: 0,
            }}>
              {initials(task.responsible)}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>
                {task.responsible}
              </div>
              <div className="mono" style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.5px' }}>
                Responsável
              </div>
            </div>
          </div>

          {/* Co-responsáveis */}
          {coResponsibles.map(name => (
            <div key={name} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 0',
              borderBottom: '1px solid var(--line-2)',
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: avatarColor(name),
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--mono)',
                fontSize: '0.68rem',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {initials(name)}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>{name}</div>
                <div className="mono" style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.5px' }}>
                  Co-responsável
                </div>
              </div>
            </div>
          ))}

          {/* Colaboradores externos */}
          {task.external_collaborators && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 0',
              borderBottom: '1px solid var(--line-2)',
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--mono)',
                fontSize: '0.68rem',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                EX
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>
                  {task.external_collaborators}
                </div>
                <div className="mono" style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.5px' }}>
                  Externo
                </div>
              </div>
            </div>
          )}

          {/* Descrição */}
          {task.description && (
            <>
              <SectionTitle>Descrição</SectionTitle>
              <div
                className="rich-content"
                style={{ fontSize: '0.86rem', color: 'var(--text-2)', lineHeight: 1.65 }}
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            </>
          )}
        </div>

        {/* Footer — botões (só se não arquivada) */}
        {!isArchived && (
          <div style={{
            borderTop: '1px solid var(--line-1)',
            padding: '16px 28px',
            display: 'flex',
            gap: 10,
            flexShrink: 0,
          }}>
            {nextStatus && onAdvanceStatus && (
              <button
                onClick={onAdvanceStatus}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 3,
                  border: 'none',
                  background: '#034EA2',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#023e82')}
                onMouseLeave={e => (e.currentTarget.style.background = '#034EA2')}
              >
                Avançar para {statusGroupLabel(nextStatus)}
              </button>
            )}

            {/* Editar */}
            <button
              onClick={() => onEdit(task)}
              title="Editar"
              style={{
                padding: '12px 16px',
                borderRadius: 3,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-2)',
                fontSize: '0.82rem',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
            >
              Editar
            </button>

            {/* Arquivar */}
            {onArchive && (
              <button
                onClick={onArchive}
                title="Arquivar"
                style={{
                  padding: '12px 16px',
                  borderRadius: 3,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-2)',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
              >
                <Archive size={14} />
              </button>
            )}
          </div>
        )}

        {/* Footer para arquivadas — apenas editar/excluir */}
        {isArchived && (
          <div style={{
            borderTop: '1px solid var(--line-1)',
            padding: '16px 28px',
            display: 'flex',
            gap: 10,
            flexShrink: 0,
          }}>
            <button
              onClick={() => onEdit(task)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 3,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-2)',
                fontSize: '0.82rem',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(task.id)}
              style={{
                padding: '12px 16px',
                borderRadius: 3,
                border: '1px solid rgba(180,35,24,0.2)',
                background: 'rgba(180,35,24,0.06)',
                color: '#b42318',
                fontSize: '0.82rem',
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Excluir
            </button>
          </div>
        )}
      </div>
    </>
  );
}
