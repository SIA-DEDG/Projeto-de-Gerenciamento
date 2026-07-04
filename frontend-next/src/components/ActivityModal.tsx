'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Paperclip, Trash2, Clock, ChevronDown, Link as LinkIcon, Pencil, Plus } from 'lucide-react';
import type { Task, Project } from '@/types';
import type { UserPublic } from '@/lib/api';
import { STATUS_COLORS, PRIORITY_COLORS, statusGroup, userProjectIds } from '@/lib/utils';
import { getUser } from '@/lib/auth';
import RichTextEditor from './RichTextEditor';
import ConfirmModal from './ConfirmModal';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityAttachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64
}

export interface ActivityLink {
  name: string;
  url: string;
}

interface Props {
  open: boolean;
  task: Task | null;
  defaultStatus?: string;
  defaultResponsible?: string;
  projects: Project[];
  tasks?: Task[];
  users: UserPublic[];
  fixedProjectId?: string | null;
  onClose: () => void;
  onSave: (data: {
    activity: string;
    description: string;
    category: string;
    project_id: string | null;
    status: string;
    responsible: string;
    date: string;
    priority: string;
    co_responsibles: string | null;
    external_collaborators: string | null;
    deadline: string | null;
    attachments?: ActivityAttachment[];
    links?: ActivityLink[];
    removedAttachmentIndices?: number[];
  }) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['Pendente', 'Em Andamento', 'Em Revisão', 'Concluído'];
const PRIORITY_OPTIONS = ['Alta', 'Média', 'Baixa'];


const EMPTY = {
  activity: '', description: '', project_id: null as string | null,
  status: 'Pendente', responsible: '', date: '',
  priority: 'Média', co_responsibles: [] as string[],
  external_collaborators: '', deadline: '',
};

// ── Label helper ──────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, justifyContent: 'space-between', display: 'flex' }}>
      {children}
    </div>
  );
}

// ── Segmented control ─────────────────────────────────────────────────────────

function Segmented({ options, value, onChange, getColor }: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  getColor?: (v: string) => string;
}) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
      {options.map((opt, i) => {
        const active = value === opt;
        const color = getColor?.(opt);
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            style={{
              flex: 1, padding: '9px 6px', fontSize: '0.78rem',
              fontWeight: active ? 600 : 500, fontFamily: 'inherit', cursor: 'pointer',
              border: 'none', borderRight: i < options.length - 1 ? '1px solid var(--border)' : 'none',
              background: active ? 'var(--blue)' : 'var(--surface)',
              color: active ? '#fff' : color ?? 'var(--text-2)',
              transition: 'background 0.12s, color 0.12s',
            }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Co-responsáveis chips ────────────────────────────────────────────────────

function CoRespChips({ users, selected, exclude, onChange }: {
  users: UserPublic[];
  selected: string[];
  exclude: string;
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const available = users.filter(u => u.name !== exclude);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function toggle(name: string) {
    onChange(selected.includes(name) ? selected.filter(n => n !== name) : [...selected, name]);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', textAlign: 'left', padding: '8px 10px',
          border: '1px solid #dfe1e6', borderRadius: 4,
          background: '#fff', fontSize: '0.9rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: 36,
          fontFamily: 'inherit',
        }}
      >
        {selected.length === 0 ? (
          <span style={{ color: '#adb5bd' }}>— Nenhum —</span>
        ) : (
          selected.map(name => (
            <span key={name} style={{
              background: '#e8f0fe', color: '#0052cc', borderRadius: 4,
              padding: '2px 6px', fontSize: '0.78rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {name}
              <span onClick={e => { e.stopPropagation(); toggle(name); }} style={{ cursor: 'pointer', lineHeight: 1 }}>×</span>
            </span>
          ))
        )}
        <ChevronDown size={12} style={{ marginLeft: 'auto', flexShrink: 0, color: '#6b778c', transform: open ? 'rotate(180deg)' : undefined }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #dfe1e6', borderRadius: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)', maxHeight: 180, overflowY: 'auto', marginTop: 2,
        }}>
          {available.length === 0 ? (
            <div style={{ padding: '10px 12px', color: '#a5adba', fontSize: '0.85rem' }}>Nenhum usuário disponível</div>
          ) : available.map(user => (
            <label key={user.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', cursor: 'pointer', fontSize: '0.88rem',
              background: selected.includes(user.name) ? '#f0f4ff' : 'transparent',
            }}>
              <input
                type="checkbox"
                checked={selected.includes(user.name)}
                onChange={() => toggle(user.name)}
                style={{ accentColor: '#0052cc', width: 14, height: 14, cursor: 'pointer' }}
              />
              {user.name}
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#6b778c' }}>{user.role}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── File Attachment Field ─────────────────────────────────────────────────────

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.mp4,.zip';

function AttachmentField({ attachments, onChange }: {
  attachments: ActivityAttachment[];
  onChange: (v: ActivityAttachment[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = (e.target?.result as string).split(',')[1] ?? '';
        onChange([...attachments, { name: file.name, type: file.type, size: file.size, data }]);
      };
      reader.readAsDataURL(file);
    });
  }

  function remove(idx: number) {
    onChange(attachments.filter((_, i) => i !== idx));
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div>
      <input ref={fileRef} type="file" multiple accept={ACCEPT} style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)} />

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)'; }}
        onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
        onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; handleFiles(e.dataTransfer.files); }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px', border: '2px dashed var(--border)', borderRadius: 3, cursor: 'pointer', transition: 'border-color 0.12s', textAlign: 'center' }}>
        <Paperclip size={18} color="var(--text-3)" />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
          Clique ou arraste arquivos (PDF, Word, Excel, imagens…)
        </span>
      </div>

      {/* File list */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {attachments.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', border: '1px solid var(--line-1)', borderRadius: 3, background: 'var(--surface-2)' }}>
              <Paperclip size={13} color="var(--text-3)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span className="mono" style={{ fontSize: '0.64rem', color: 'var(--text-3)', flexShrink: 0 }}>{formatSize(f.size)}</span>
              <button type="button" onClick={() => remove(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', flexShrink: 0, padding: 2, borderRadius: 2 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#b42318')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Preview card ──────────────────────────────────────────────────────────────

function PreviewCard({ activity, category, priority, status, responsible, deadline, coResps, noDeadline }: {
  activity: string; category: string; priority: string; status: string;
  responsible: string; deadline: string; coResps: string[]; noDeadline: boolean;
}) {
  const spine = STATUS_COLORS[statusGroup(status)] ?? '#9aa1ac';
  const prioColor = PRIORITY_COLORS[priority] ?? 'var(--text-3)';
  const allAvatars = responsible ? [responsible, ...coResps] : coResps;

  function dueText(): { text: string; color: string } | null {
    if (noDeadline || !deadline) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(deadline + 'T00:00:00');
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return { text: 'Atrasada', color: '#b42318' };
    if (diff === 0) return { text: 'Vence hoje', color: '#A87A00' };
    if (diff === 1) return { text: 'Vence amanhã', color: '#A87A00' };
    const [, mm, dd] = deadline.split('-');
    return { text: `${dd}/${mm}`, color: 'var(--text-3)' };
  }
  const due = dueText();

  return (
    <div style={{ position: 'relative', border: '1px solid var(--line-1)', borderRadius: 3, padding: '15px 18px 15px 20px', background: 'var(--surface-2)', overflow: 'hidden' }}>
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: spine }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          {category || 'Categoria'}
        </span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: prioColor }}>
          {priority}
        </span>
      </div>

      <p style={{ fontSize: '0.92rem', fontWeight: 500, color: activity ? 'var(--text)' : 'var(--text-3)', lineHeight: 1.4, margin: 0 }}>
        {activity || 'Título da atividade…'}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {allAvatars.slice(0, 3).map((name, i) => {
            const inits = name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
            return (
              <div key={name + i} className="mono" title={name} style={{ width: 22, height: 22, borderRadius: '50%', background: '#072f63', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 500, marginLeft: i > 0 ? -6 : 0, border: '1.5px solid var(--surface-2)', flexShrink: 0, letterSpacing: '0.5px' }}>
                {inits}
              </div>
            );
          })}
        </div>
        {due && (
          <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.64rem', fontWeight: 500, color: due.color }}>
            <Clock size={10} strokeWidth={2} />
            {due.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ActivityModal({
  open, task, defaultStatus, defaultResponsible, projects, tasks = [], users, fixedProjectId, onClose, onSave,
}: Props) {
  const [form, setForm] = useState(EMPTY);
  const [noDeadline, setNoDeadline] = useState(false);
  const [attachments, setAttachments] = useState<ActivityAttachment[]>([]);
  const [links, setLinks] = useState<ActivityLink[]>([]);
  const [existingLinks, setExistingLinks] = useState<{ name: string; url: string; idx: number }[]>([]);
  const [removedLinkIdxs, setRemovedLinkIdxs] = useState<number[]>([]);
  const [linkInput, setLinkInput] = useState({ name: '', url: '' });
  const [onlyMyProjects, setOnlyMyProjects] = useState(true);
  const [confirmRemoveLink, setConfirmRemoveLink] = useState<{ name: string; idx: number } | null>(null);
  const [confirmUnaddedLink, setConfirmUnaddedLink] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  // Snapshot do form no momento da abertura, para detectar alterações não salvas.
  const initialSnapshot = useRef('');

  useEffect(() => {
    if (!open) return;
    setAttachments([]);
    setLinks([]);
    setLinkInput({ name: '', url: '' });
    setRemovedLinkIdxs([]);
    setConfirmUnaddedLink(false);
    setConfirmClose(false);
    setExistingLinks(
      (task?.attachments ?? [])
        .map((a, idx) => ({ a, idx }))
        .filter((e): e is { a: { type: 'link'; name: string; url: string }; idx: number } => e.a.type === 'link')
        .map(({ a, idx }) => ({ name: a.name, url: a.url, idx })),
    );
    let formInit: typeof EMPTY;
    let noDeadlineInit: boolean;
    if (task) {
      const sg = task.status_group;
      const mapped = sg === 'done' ? 'Concluído' : sg === 'review' ? 'Em Revisão' : sg === 'in_progress' ? 'Em Andamento' : 'Pendente';
      let co: string[] = [];
      try { co = task.co_responsibles ? JSON.parse(task.co_responsibles) : []; } catch { co = []; }
      noDeadlineInit = !task.deadline;
      formInit = { activity: task.activity, description: task.description ?? '', project_id: task.project_id ?? null, status: mapped, responsible: task.responsible, date: task.date ?? '', priority: task.priority ?? 'Média', co_responsibles: co, external_collaborators: task.external_collaborators ?? '', deadline: task.deadline ?? '' };
    } else {
      const pid = fixedProjectId ?? null;
      noDeadlineInit = false;
      formInit = { ...EMPTY, status: defaultStatus ?? 'Pendente', project_id: pid, responsible: defaultResponsible ?? '' };
    }
    setNoDeadline(noDeadlineInit);
    setForm(formInit);
    initialSnapshot.current = JSON.stringify({ form: formInit, noDeadline: noDeadlineInit });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  const myName = getUser()?.name ?? '';
  const myId = getUser()?.user_id ?? null;
  const myProjectIds = useMemo(() => userProjectIds(projects, tasks, myName, myId), [projects, tasks, myName, myId]);

  if (!open) return null;

  const project = projects.find(p => p.id === form.project_id);
  const categoryLabel = project?.name ?? form.project_id ?? '';

  function submitWith(finalLinks: ActivityLink[]) {
    onSave({
      ...form,
      category: categoryLabel,
      co_responsibles: form.co_responsibles.length > 0 ? JSON.stringify(form.co_responsibles) : null,
      external_collaborators: form.external_collaborators.trim() || null,
      deadline: noDeadline ? null : (form.deadline.trim() || null),
      attachments: attachments.length > 0 ? attachments : undefined,
      links: finalLinks.length > 0 ? finalLinks : undefined,
      removedAttachmentIndices: removedLinkIdxs.length > 0 ? removedLinkIdxs : undefined,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.activity.trim()) return;
    // Digitou um link mas não clicou em "+": pergunta antes de salvar.
    if (linkInput.url.trim()) {
      setConfirmUnaddedLink(true);
      return;
    }
    submitWith(links);
  }

  // Há algo digitado/alterado que seria perdido ao fechar?
  function isDirty(): boolean {
    return (
      JSON.stringify({ form, noDeadline }) !== initialSnapshot.current ||
      attachments.length > 0 ||
      links.length > 0 ||
      removedLinkIdxs.length > 0 ||
      linkInput.name.trim() !== '' ||
      linkInput.url.trim() !== ''
    );
  }

  function requestClose() {
    if (isDirty()) setConfirmClose(true);
    else onClose();
  }

  const showProjectSelect = fixedProjectId == null;
  const fixedProject = fixedProjectId != null ? projects.find(p => p.id === fixedProjectId) : null;
  const isEdit = !!task;

  // Filtra o select de projeto para "meus projetos" (mantém sempre o já selecionado visível).
  const visibleProjects = onlyMyProjects
    ? projects.filter(p => myProjectIds.has(p.id) || p.id === form.project_id)
    : projects;

  const inp: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <>
      {/* Backdrop */}
      <div onClick={requestClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,0.32)', zIndex: 60 }} />

      {/* Drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 700, maxWidth: '94%', background: 'var(--surface)', overflowY: 'auto', zIndex: 61, borderLeft: '1px solid var(--line-1)', animation: 'drawin .24s cubic-bezier(.4,0,.2,1) both', display: 'flex', flexDirection: 'column' }}>

        {/* Stripe Gov-PI */}
        <div style={{ height: 4, flexShrink: 0, background: 'linear-gradient(90deg,var(--blue-fixed) 0 40%,#E0A92E 40% 55%,#b42318 55% 75%,#1B8A4B 75%)' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--line-1)', flexShrink: 0, position: 'sticky', top: 4, background: 'var(--surface)', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--blue-fixed)', flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-2)' }}>
              {isEdit ? 'Editar atividade' : 'Nova atividade'}
            </span>
          </div>
          <button type="button" onClick={requestClose}
            style={{ width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Preview card */}
            {/* <div>
              <Label>Pré-visualização</Label>
              <PreviewCard
                activity={form.activity} category={categoryLabel} priority={form.priority}
                status={form.status} responsible={form.responsible} deadline={form.deadline}
                coResps={form.co_responsibles} noDeadline={noDeadline}
              />
            </div> */}

            {/* Atividade */}
            <div>
              <Label>Atividade <span style={{color: 'rgb(255, 0, 0)'}}>*</span></Label>
              <input value={form.activity} onChange={e => setForm({ ...form, activity: e.target.value })} placeholder="Ex: Revisar roteiro do evento" required style={inp}
                onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
            </div>

            {/* Descrição */}
            <div>
              <Label>Descrição <span style={{color: 'rgb(255, 0, 0)'}}>*</span></Label>
              <RichTextEditor value={form.description} onChange={html => setForm(f => ({ ...f, description: html }))} />
            </div>

            {/* Prioridade */}
            <div>
              <Label>Prioridade</Label>
              <Segmented options={PRIORITY_OPTIONS} value={form.priority} onChange={v => setForm({ ...form, priority: v })} getColor={v => PRIORITY_COLORS[v]} />
            </div>

            {/* Grid: Projeto | Status */}
            <div style={{ display: 'grid', gridTemplateColumns: showProjectSelect ? '1fr 1fr' : '1fr', gap: 14 }}>
              {showProjectSelect && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>Projeto</div>
                    <button type="button" onClick={() => setOnlyMyProjects(v => !v)} disabled={!myName}
                      title="Mostrar apenas projetos em que você é responsável ou participa"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: myName ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                      <span className="mono" style={{ fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: onlyMyProjects ? 'var(--blue)' : 'var(--text-3)' }}>Meus projetos</span>
                      <span style={{ position: 'relative', width: 24, height: 14, borderRadius: 7, background: onlyMyProjects ? 'var(--blue)' : 'var(--line-2)', transition: 'background .12s', flexShrink: 0 }}>
                        <span style={{ position: 'absolute', top: 2, left: onlyMyProjects ? 12 : 2, width: 10, height: 10, borderRadius: '50%', background: '#fff', transition: 'left .14s' }} />
                      </span>
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <select value={form.project_id ?? ''} onChange={e => setForm({ ...form, project_id: e.target.value || null })} style={{ ...inp, padding: '11px 32px 11px 13px', appearance: 'none', cursor: 'pointer' }}>
                      <option value="">— Sem projeto —</option>
                      {visibleProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} />
                  </div>
                </div>
              )}
              {fixedProject && (
                <div>
                  <Label>Projeto</Label>
                  <div style={{ padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface-2)', fontSize: '0.9rem', color: 'var(--text-2)' }}>{fixedProject.name}</div>
                </div>
              )}
              <div>
                <Label>Status</Label>
                <Segmented options={STATUS_OPTIONS} value={form.status} onChange={v => setForm({ ...form, status: v })} />
              </div>
            </div>

            {/* Grid: Responsável | Data */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <Label>Responsável</Label>
                <div style={{ position: 'relative' }}>
                  <select value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value, co_responsibles: form.co_responsibles.filter(n => n !== e.target.value) })} style={{ ...inp, padding: '11px 32px 11px 13px', appearance: 'none', cursor: 'pointer' }}>
                    <option value="">— Sem responsável —</option>
                    {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} />
                </div>
              </div>
              <div>
                <Label>Data</Label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp}
                  onFocus={e => { e.target.style.borderColor = 'var(--blue)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; }} />
              </div>
            </div>

            {/* Prazo */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <Label>Prazo (opcional)</Label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-2)', cursor: 'pointer', marginTop: -3 }}>
                  <input type="checkbox" checked={noDeadline} onChange={e => { setNoDeadline(e.target.checked); if (e.target.checked) setForm({ ...form, deadline: '' }); }} style={{ accentColor: 'var(--blue)', cursor: 'pointer', width: 14, height: 14 }} />
                  Indeterminado
                </label>
              </div>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} disabled={noDeadline} style={{ ...inp, opacity: noDeadline ? 0.4 : 1, cursor: noDeadline ? 'not-allowed' : 'text' }}
                onFocus={e => { if (!noDeadline) { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; } }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
            </div>

            {/* Co-responsáveis */}
            <div>
              <Label>Co-responsáveis</Label>
              <CoRespChips users={users} selected={form.co_responsibles} exclude={form.responsible} onChange={v => setForm({ ...form, co_responsibles: v })} />
            </div>

            {/* Colaboração externa */}
            <div>
              <Label>Colaboradores externos</Label>
              <input value={form.external_collaborators} onChange={e => setForm({ ...form, external_collaborators: e.target.value })} placeholder="Nomes separados por vírgula (parceiros, terceiros)" style={inp}
                onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
            </div>

            {/* Anexos */}
            <div>
              <Label>Arquivos anexados</Label>
              <AttachmentField attachments={attachments} onChange={setAttachments} />
            </div>

            {/* Links */}
            <div>
              <Label>
                <p>Links</p> <p>Adicionar</p>
              </Label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  value={linkInput.name} onChange={e => setLinkInput(v => ({ ...v, name: e.target.value }))}
                  placeholder="Nome (ex: Relatório no Drive)"
                  style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.84rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
                <input
                  value={linkInput.url} onChange={e => setLinkInput(v => ({ ...v, url: e.target.value }))}
                  placeholder="https://..."
                  style={{ flex: 2, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.84rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
                <button type="button"
                  onClick={() => {
                    const url = linkInput.url.trim();
                    if (!url) return;
                    const name = linkInput.name.trim() || url;
                    setLinks(prev => [...prev, { name, url }]);
                    setLinkInput({ name: '', url: '' });
                  }}
                  style={{ padding: '9px 14px', border: 'none', borderRadius: 3, background: '#034EA2', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  <Plus size={14} />
                </button>
              </div>
              {(existingLinks.some(l => !removedLinkIdxs.includes(l.idx)) || links.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {existingLinks.filter(l => !removedLinkIdxs.includes(l.idx)).map((l) => (
                    <div key={`e${l.idx}`} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', border: '1px solid var(--line-1)', borderRadius: 3, background: 'var(--surface-2)' }}>
                      <LinkIcon size={13} color="var(--blue)" style={{ flexShrink: 0 }} />
                      <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}>{l.name}</a>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{l.url}</span>
                      <button type="button" title="Editar" onClick={() => { setLinkInput({ name: l.name, url: l.url }); setRemovedLinkIdxs(prev => prev.includes(l.idx) ? prev : [...prev, l.idx]); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 2, borderRadius: 2 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                        <Pencil size={13} />
                      </button>
                      <button type="button" title="Remover" onClick={() => setConfirmRemoveLink({ name: l.name, idx: l.idx })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 2, borderRadius: 2 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#b42318')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {links.map((l, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', border: '1px solid var(--line-1)', borderRadius: 3, background: 'var(--surface-2)' }}>
                      <LinkIcon size={13} color="var(--blue)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{l.url}</span>
                      <button type="button" title="Editar" onClick={() => { setLinkInput({ name: l.name, url: l.url }); setLinks(prev => prev.filter((_, j) => j !== i)); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 2, borderRadius: 2 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                        <Pencil size={13} />
                      </button>
                      <button type="button" title="Remover" onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 2, borderRadius: 2 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#b42318')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button type="submit" style={{ flex: 1, padding: 12, border: 'none', borderRadius: 3, background: 'var(--blue)', color: '#fff', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-h)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--blue)')}>
                {isEdit ? 'Salvar alterações' : 'Criar atividade'}
              </button>
              <button type="button" onClick={requestClose} style={{ padding: '12px 18px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.84rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={confirmRemoveLink !== null}
        title="Remover link"
        message={confirmRemoveLink ? `Remover o link "${confirmRemoveLink.name}"?` : undefined}
        confirmLabel="Remover"
        danger
        onConfirm={() => { if (confirmRemoveLink) setRemovedLinkIdxs(prev => [...prev, confirmRemoveLink.idx]); }}
        onClose={() => setConfirmRemoveLink(null)}
      />

      {/* Link digitado mas não adicionado ao clicar em salvar */}
      <ConfirmModal
        open={confirmUnaddedLink}
        title="Opa, faltou adicionar o link"
        message="Você escreveu um link mas não clicou no +. Quer incluí-lo?"
        confirmLabel="Sim, adicionar"
        cancelLabel="Não, salvar assim"
        onConfirm={() => {
          const url = linkInput.url.trim();
          const name = linkInput.name.trim() || url;
          submitWith(url ? [...links, { name, url }] : links);
        }}
        onCancel={() => submitWith(links)}
        onClose={() => setConfirmUnaddedLink(false)}
      />

      {/* Alterações não salvas ao tentar sair */}
      <ConfirmModal
        open={confirmClose}
        title="Tem certeza que quer sair?"
        message="Você vai perder tudo que preencheu até agora."
        confirmLabel="Sim, sair"
        cancelLabel="Continuar edição"
        danger
        onConfirm={onClose}
        onClose={() => setConfirmClose(false)}
      />
    </>
  );
}
