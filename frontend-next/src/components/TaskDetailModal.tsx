'use client';

import type { Task } from '@/types';
import { avatarColor, initials } from '@/lib/utils';
import { Folder, Calendar, Clock, Trash2, Pencil } from 'lucide-react';
import BrandStripe from './BrandStripe';

interface Props {
  open: boolean;
  task: Task | null;
  projectName?: string;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{
        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-muted)',
      }}>
        {label}
      </span>
      {children}
    </div>
  );
}

const PRIORITY_ACCENT: Record<string, string> = {
  alta:  '#ef4123',
  média: '#fdb913',
  baixa: '#007932',
};

const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  pending:     { bg: 'var(--status-todo)',     color: 'var(--status-todo-text)'     },
  in_progress: { bg: 'var(--status-progress)', color: 'var(--status-progress-text)' },
  done:        { bg: 'var(--status-done)',     color: 'var(--status-done-text)'     },
};

export default function TaskDetailModal({ open, task, projectName, onClose, onEdit, onDelete }: Props) {
  if (!open || !task) return null;

  const today = new Date().toISOString().split('T')[0];
  const isOverdue  = task.deadline && task.status_group !== 'done' && task.deadline < today;
  const isDueSoon  = !isOverdue && task.deadline && task.status_group !== 'done' &&
    task.deadline <= new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  let coResponsibles: string[] = [];
  try { coResponsibles = task.co_responsibles ? JSON.parse(task.co_responsibles) : []; } catch { /* */ }

  const accentColor = PRIORITY_ACCENT[task.priority?.toLowerCase() ?? ''] ?? 'var(--primary)';
  const statusChip  = STATUS_CHIP[task.status_group] ?? { bg: 'var(--bg-subtle)', color: 'var(--text-muted)' };

  return (
    <>
      {/* Backdrop escurecido, consistente com os demais modais */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 299, background: 'rgba(7,22,45,0.32)' }}
        onClick={onClose}
      />

      {/* Sliding panel */}
      <div style={{
        position: 'fixed',
        top: 'var(--topbar-height)',
        right: 0,
        bottom: 0,
        width: 460,
        background: '#fff',
        borderLeft: '1px solid var(--border-light)',
        boxShadow: '-8px 0 40px rgba(3,78,162,0.10)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 300,
        animation: 'panel-slide-in 0.22s cubic-bezier(0.4,0,0.2,1) forwards',
      }}>

        {/* Faixa institucional (listras da bandeira do PI) — cor via --brand-stripe */}
        <BrandStripe height={5} />

        {/* ── Panel header ──────────────────────── */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 5,
              }}>
                SIA-{task.id.slice(0, 8).toUpperCase()}
              </div>
              <h2 style={{
                fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)',
                lineHeight: 1.4, margin: 0, fontFamily: 'inherit',
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {task.activity}
              </h2>
            </div>
            <button
              onClick={onClose}
              title="Fechar"
              style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)', background: 'var(--bg-subtle)',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all var(--transition-fast)', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              ✕
            </button>
          </div>

          {/* Status + Priority + Category */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 9px', borderRadius: 3,
              background: statusChip.bg, color: statusChip.color,
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.03em',
            }}>
              {task.status}
            </span>
            {task.priority && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 9px', borderRadius: 3,
                background: `${accentColor}14`, color: accentColor,
                fontSize: '0.72rem', fontWeight: 700,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
                {task.priority}
              </span>
            )}
            {task.category && (
              <span style={{
                padding: '3px 9px', borderRadius: 3,
                background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
                fontSize: '0.72rem', fontWeight: 600,
                border: '1px solid var(--border-light)',
              }}>
                {task.category}
              </span>
            )}
          </div>
        </div>

        {/* ── Panel body (scrollable) ────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Description */}
          <Field label="Descrição">
            {task.description ? (
              <div
                className="rich-content"
                style={{
                  fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.7,
                  padding: '12px 14px', background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
                }}
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Sem descrição.
              </span>
            )}
          </Field>

          {/* Separator */}
          <div style={{ height: 1, background: 'var(--border-light)' }} />

          {/* Metadata grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 16px' }}>

            {task.responsible && (
              <Field label="Responsável">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="jira-avatar" style={{ background: avatarColor(task.responsible), width: 26, height: 26, fontSize: '0.6rem', flexShrink: 0 }}>
                    {initials(task.responsible)}
                  </div>
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 500 }}>{task.responsible}</span>
                </div>
              </Field>
            )}

            {projectName && (
              <Field label="Projeto">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Folder size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 500 }}>{projectName}</span>
                </div>
              </Field>
            )}

            <Field label="Criado em">
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Calendar size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 500 }}>{fmtDate(task.date)}</span>
              </div>
            </Field>

            <Field label="Prazo de finalização">
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <Clock size={12} color={isOverdue ? '#ef4123' : isDueSoon ? '#b45309' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.84rem', fontWeight: isOverdue || isDueSoon ? 700 : 500, color: isOverdue ? '#ef4123' : isDueSoon ? '#b45309' : 'var(--text-primary)' }}>
                  {fmtDate(task.deadline)}
                </span>
                {isOverdue && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(239,65,35,0.1)', color: '#c0392b', padding: '1px 6px', borderRadius: 3 }}>Vencido</span>
                )}
                {isDueSoon && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'rgba(180,83,9,0.1)', color: '#b45309', padding: '1px 6px', borderRadius: 3 }}>Em breve</span>
                )}
              </div>
            </Field>

            {coResponsibles.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Co-responsáveis">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                    {coResponsibles.map(name => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="jira-avatar" style={{ background: avatarColor(name), width: 22, height: 22, fontSize: '0.55rem', flexShrink: 0 }}>
                          {initials(name)}
                        </div>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>{name}</span>
                      </div>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {task.external_collaborators && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Colaboração externa">
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 500 }}>{task.external_collaborators}</span>
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* ── Panel footer ──────────────────────── */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-light)',
          background: 'var(--bg-subtle)',
          display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={() => { onClose(); onDelete(task.id); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 13px', borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(239,65,35,0.3)', background: 'transparent',
              color: '#ef4123', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,65,35,0.07)'; e.currentTarget.style.borderColor = '#ef4123'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(239,65,35,0.3)'; }}
          >
            <Trash2 size={12} />
            Excluir
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)', background: '#fff',
              color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => { onClose(); onEdit(task); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 16px', borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'var(--primary)', color: '#fff',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary)'; }}
          >
            <Pencil size={12} />
            Editar
          </button>
        </div>
      </div>
    </>
  );
}
