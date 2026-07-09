'use client';

import { useState, useEffect } from 'react';
import { X, Archive, Trash2, Pencil, Folder, Calendar, Clock, Paperclip, Link as LinkIcon, Download, ExternalLink, Pin } from 'lucide-react';
import type { Task, TaskAttachment } from '@/types';
import { avatarColor, initials, statusGroupLabel } from '@/lib/utils';
import { getTaskAttachmentUrl, pinTask, unpinTask } from '@/lib/api';
import { openSignedUrl } from '@/lib/download';
import { useToast } from '@/hooks/useToast';
import ToastContainer from './ToastContainer';
import CollapsibleGroup from './CollapsibleGroup';
import BrandStripe from './BrandStripe';

interface Props {
  task: Task;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onAdvanceStatus?: () => void;
  onArchive?: (id: string) => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  Alta:  '#b42318',
  Média: '#A87A00',
  Baixa: '#157F3C',
};

const STATUS_COLOR: Record<string, string> = {
  pending:     '#9aa1ac',
  in_progress: '#034ea2',
  review:      '#E0A92E',
  done:        '#1B8A4B',
};

const NEXT_LABEL: Record<string, string> = {
  pending:     'Em Andamento',
  in_progress: 'Em Revisão',
  review:      'Concluído',
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

function deadlineBadge(deadline: string | null | undefined, isDone: boolean): { label: string; color: string; bg: string } | null {
  if (!deadline || isDone) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + 'T00:00:00');
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { label: `Atrasado ${Math.abs(diff)}d`, color: '#b42318', bg: 'rgba(180,35,24,0.08)' };
  if (diff === 0) return { label: 'Vence hoje',   color: '#A87A00', bg: 'rgba(168,122,0,0.08)' };
  if (diff <= 3)  return { label: 'Em breve',     color: '#A87A00', bg: 'rgba(168,122,0,0.08)' };
  return null;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentsSection({ task }: { task: Task }) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments ?? []);
  const [loading, setLoading] = useState<number | null>(null);

  // Re-sincroniza quando a tarefa é atualizada (ex.: novo link salvo no editor).
  useEffect(() => { setAttachments(task.attachments ?? []); }, [task.attachments]);
  const { toasts, addToast, dismissToast } = useToast();

  async function handleDownload(att: TaskAttachment & { type: 'file' }, idx: number) {
    setLoading(idx);
    try {
      await openSignedUrl(() => getTaskAttachmentUrl(task.id, idx));
    } catch (e: any) {
      addToast('error', 'Download falhou', e?.message || 'Não foi possível baixar o anexo. Tente novamente.');
    } finally { setLoading(null); }
  }

  const files = attachments.filter((a): a is TaskAttachment & { type: 'file' } => a.type === 'file');
  const links = attachments.filter((a): a is TaskAttachment & { type: 'link' } => a.type === 'link');

  // Sempre mostra os grupos Arquivos e Links (mesmo vazios, com contagem 0).
  const emptyHint = (label: string) => (
    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', padding: '2px 0' }}>{label}</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <CollapsibleGroup label="Arquivos" count={files.length} defaultOpen={false}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {files.length === 0 && emptyHint('Nenhum arquivo.')}
        {files.map((f, i) => {
          const idx = attachments.indexOf(f);
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', border: '1px solid var(--line-1)', borderRadius: 3, background: 'var(--surface-2)' }}>
              <Paperclip size={13} color="var(--text-3)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div className="mono" style={{ fontSize: '0.64rem', color: 'var(--text-3)' }}>{formatSize(f.size)}</div>
              </div>
              <button onClick={() => handleDownload(f, idx)} disabled={loading === idx}
                title="Baixar"
                style={{ width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: loading === idx ? 'var(--text-3)' : 'var(--blue)', cursor: loading === idx ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Download size={13} />
              </button>
            </div>
          );
        })}
      </div>
      </CollapsibleGroup>
      <div style={{ height: 1, background: 'var(--line-2)' }} />
      <CollapsibleGroup label="Links" count={links.length} defaultOpen={false}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {links.length === 0 && emptyHint('Nenhum link.')}
        {links.map((l) => {
          const idx = attachments.indexOf(l);
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', border: '1px solid var(--line-1)', borderRadius: 3, background: 'var(--surface-2)' }}>
              <LinkIcon size={13} color="var(--blue)" style={{ flexShrink: 0 }} />
              <a href={l.url} target="_blank" rel="noreferrer" title="Abrir link"
                style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--blue)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.url}</div>
              </a>
              <a href={l.url} target="_blank" rel="noreferrer" title="Abrir link"
                style={{ width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, textDecoration: 'none' }}>
                <ExternalLink size={13} />
              </a>
            </div>
          );
        })}
      </div>
      </CollapsibleGroup>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function DrawerDetalhe({ task, onClose, onEdit, onDelete, onAdvanceStatus, onArchive }: Props) {
  const coResponsibles = parseNames(task.co_responsibles);
  const statusColor  = STATUS_COLOR[task.status_group] ?? '#9aa1ac';
  const prioColor    = PRIORITY_COLOR[task.priority] ?? 'var(--text-2)';
  const nextLabel    = NEXT_LABEL[task.status_group];
  const badge        = deadlineBadge(task.deadline, task.status_group === 'done');
  const isArchived   = (task as { archived?: boolean }).archived === true;

  // Pin é por usuário — estado local otimista sincronizado com a task.
  const [pinned, setPinned] = useState(!!task.pinned);
  useEffect(() => { setPinned(!!task.pinned); }, [task.pinned]);
  async function togglePin() {
    const next = !pinned;
    setPinned(next);
    try { await (next ? pinTask(task.id) : unpinTask(task.id)); }
    catch { setPinned(!next); }
  }

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,.28)', zIndex: 50 }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 650, maxWidth: '100vw',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--line-1)',
        zIndex: 51,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight .24s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
      }}>

        {/* Faixa institucional (listras da bandeira do PI) — cor via --brand-stripe */}
        <BrandStripe />

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div style={{ minWidth: 0 }}>
              <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>
                SIA-{task.id.slice(0, 8).toUpperCase()}
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-0.4px', color: 'var(--text)', lineHeight: 1.35, margin: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                {task.activity}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                onClick={togglePin}
                title={pinned ? 'Desafixar atividade' : 'Fixar atividade no topo'}
                style={{ width: 30, height: 30, borderRadius: 3, border: `1px solid ${pinned ? 'var(--blue)' : 'var(--border)'}`, background: pinned ? 'var(--blue)' : 'var(--surface)', color: pinned ? '#fff' : 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Pin size={14} fill={pinned ? '#fff' : 'none'} />
              </button>
              <button
                onClick={onClose}
                style={{ width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Chips: status · prioridade · categoria */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {/* Status */}
            <span style={{
              padding: '4px 10px', borderRadius: 4,
              background: `${statusColor}14`, color: statusColor,
              fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--mono)',
              letterSpacing: '0.3px',
            }}>
              {statusGroupLabel(task.status_group)}
            </span>

            {/* Prioridade */}
            {task.priority && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 4,
                background: `${prioColor}12`, color: prioColor,
                fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--mono)',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: prioColor, flexShrink: 0 }} />
                {task.priority}
              </span>
            )}

            {/* Categoria */}
            {task.category && (
              <span style={{
                padding: '4px 10px', borderRadius: 4,
                background: 'var(--surface-2)', color: 'var(--text-2)',
                fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--mono)',
                border: '1px solid var(--line-1)',
              }}>
                {task.category}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Descrição */}
          {task.description ? (
            <div>
              <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 10 }}>
                Descrição
              </div>
              <div
                className="rich-content"
                style={{ fontSize: '0.86rem', color: 'var(--text-2)', lineHeight: 1.65, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 4, border: '1px solid var(--line-1)' }}
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            </div>
          ) : null}

          {/* Divisor */}
          <div style={{ height: 1, background: 'var(--line-1)' }} />

          {/* Grid de metadados 2 colunas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 16px' }}>

            {/* Responsável */}
            <div>
              <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 8 }}>
                Responsável
              </div>
              {task.responsible ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: avatarColor(task.responsible),
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--mono)', fontSize: '0.64rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {initials(task.responsible)}
                  </div>
                  <span style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text)' }}>{task.responsible}</span>
                </div>
              ) : <span style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>—</span>}
            </div>

            {/* Projeto */}
            <div>
              <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 8 }}>
                Projeto
              </div>
              {(task as { project_name?: string | null }).project_name ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Folder size={14} strokeWidth={1.8} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text)' }}>{(task as { project_name?: string | null }).project_name}</span>
                </div>
              ) : <span style={{ fontSize: '0.84rem', color: 'var(--text-3)' }}>—</span>}
            </div>

            {/* Criado em */}
            <div>
              <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 8 }}>
                Criado em
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Calendar size={13} strokeWidth={1.8} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)' }}>{formatDate(task.date)}</span>
              </div>
            </div>

            {/* Prazo de finalização */}
            <div>
              <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 8 }}>
                Prazo de finalização
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <Clock size={13} strokeWidth={1.8} style={{ color: badge ? badge.color : 'var(--text-3)', flexShrink: 0 }} />
                <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 500, color: badge ? badge.color : 'var(--text)' }}>
                  {formatDate(task.deadline)}
                </span>
                {badge && (
                  <span style={{ fontSize: '0.66rem', fontWeight: 700, fontFamily: 'var(--mono)', padding: '2px 7px', borderRadius: 3, background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Co-responsáveis */}
          {coResponsibles.length > 0 && (
            <div>
              <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 10 }}>
                Co-responsáveis
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {coResponsibles.map(name => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: avatarColor(name),
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--mono)', fontSize: '0.62rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {initials(name)}
                    </div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text)' }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Colaboradores externos */}
          {task.external_collaborators && (
            <div>
              <div className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 10 }}>
                Colaboradores externos
              </div>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-2)' }}>{task.external_collaborators}</span>
            </div>
          )}

          {/* Anexos */}
          <AttachmentsSection task={task} />
        </div>

        {/* Footer */}
        {!isArchived ? (
          <div style={{ borderTop: '1px solid var(--line-1)', padding: '14px 24px', display: 'flex', gap: 8, flexShrink: 0 }}>
            {/* Avançar status */}
            {nextLabel && onAdvanceStatus && (
              <button
                onClick={onAdvanceStatus}
                style={{ flex: 1, padding: '10px', borderRadius: 3, border: 'none', background: 'var(--blue)', color: '#fff', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-h)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--blue)')}
              >
                Avançar para {nextLabel}
              </button>
            )}

            {/* Editar */}
            <button
              onClick={() => onEdit(task)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.82rem', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
            >
              <Pencil size={13} />Editar
            </button>

            {/* Arquivar */}
            {onArchive && (
              <button
                onClick={() => onArchive(task.id)}
                title="Arquivar"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.82rem', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
              >
                <Archive size={13} />
                Arquivar
              </button>
            )}

            {/* Excluir */}
            <button
              onClick={() => onDelete(task.id)}
              title="Excluir"
              style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: 3, border: '1px solid rgba(180,35,24,0.2)', background: 'rgba(180,35,24,0.05)', color: '#b42318', fontSize: '0.82rem', fontFamily: 'inherit', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.05)')}
            >
              <Trash2 size={13} />
              Excluir
            </button>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--line-1)', padding: '14px 24px', display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => onEdit(task)} style={{ flex: 1, padding: '10px', borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.82rem', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>Editar</button>
            <button onClick={() => onDelete(task.id)} style={{ padding: '10px 16px', borderRadius: 3, border: '1px solid rgba(180,35,24,0.2)', background: 'rgba(180,35,24,0.06)', color: '#b42318', fontSize: '0.82rem', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>Excluir</button>
          </div>
        )}
      </div>
    </>
  );
}
