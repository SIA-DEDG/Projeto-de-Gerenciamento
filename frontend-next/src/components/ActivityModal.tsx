'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Paperclip, Trash2 } from 'lucide-react';
import type { Task, Project } from '@/types';
import type { UserPublic } from '@/lib/api';
import RichTextEditor from './RichTextEditor';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityAttachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64
}

interface Props {
  open: boolean;
  task: Task | null;
  defaultStatus?: string;
  defaultResponsible?: string;
  projects: Project[];
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
  }) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['Pendente', 'Em Andamento', 'Em Revisão', 'Concluído'];
const PRIORITY_OPTIONS = ['Alta', 'Média', 'Baixa'];

const SPINE_COLOR: Record<string, string> = {
  Pendente: '#9aa1ac', 'Em Andamento': '#034EA2', 'Em Revisão': '#E0A92E', Concluído: '#1B8A4B',
};
const PRIO_COLOR: Record<string, string> = {
  Alta: '#034EA2', Média: 'var(--text-2)', Baixa: 'var(--text-3)',
};

const EMPTY = {
  activity: '', description: '', project_id: null as string | null,
  status: 'Pendente', responsible: '', date: '',
  priority: 'Média', co_responsibles: [] as string[],
  external_collaborators: '', deadline: '',
};

// ── Label helper ──────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>
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
              background: active ? '#034EA2' : 'var(--surface)',
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
  const available = users.filter(u => u.name !== exclude);
  function toggle(name: string) {
    onChange(selected.includes(name) ? selected.filter(n => n !== name) : [...selected, name]);
  }
  if (available.length === 0) return <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Nenhum usuário disponível</div>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {available.map(u => {
        const active = selected.includes(u.name);
        return (
          <button key={u.id} type="button" onClick={() => toggle(u.name)}
            style={{
              padding: '7px 11px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.78rem', border: `1px solid ${active ? '#034EA2' : 'var(--border)'}`,
              background: active ? 'rgba(3,78,162,0.06)' : 'var(--surface)',
              color: active ? '#034EA2' : 'var(--text-2)',
              fontWeight: active ? 600 : 500, transition: 'all 0.12s',
            }}>
            {u.name}
          </button>
        );
      })}
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
        onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = '#034EA2'; }}
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
  const spine = SPINE_COLOR[status] ?? '#9aa1ac';
  const prioColor = PRIO_COLOR[priority] ?? 'var(--text-3)';
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
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            {due.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ActivityModal({
  open, task, defaultStatus, defaultResponsible, projects, users, fixedProjectId, onClose, onSave,
}: Props) {
  const [form, setForm] = useState(EMPTY);
  const [noDeadline, setNoDeadline] = useState(false);
  const [attachments, setAttachments] = useState<ActivityAttachment[]>([]);

  useEffect(() => {
    if (!open) return;
    setAttachments([]);
    if (task) {
      const sg = task.status_group;
      const mapped = sg === 'done' ? 'Concluído' : sg === 'review' ? 'Em Revisão' : sg === 'in_progress' ? 'Em Andamento' : 'Pendente';
      let co: string[] = [];
      try { co = task.co_responsibles ? JSON.parse(task.co_responsibles) : []; } catch { co = []; }
      setNoDeadline(!task.deadline);
      setForm({ activity: task.activity, description: task.description ?? '', project_id: task.project_id ?? null, status: mapped, responsible: task.responsible, date: task.date ?? '', priority: task.priority ?? 'Média', co_responsibles: co, external_collaborators: task.external_collaborators ?? '', deadline: task.deadline ?? '' });
    } else {
      const pid = fixedProjectId ?? projects[0]?.id ?? null;
      setNoDeadline(false);
      setForm({ ...EMPTY, status: defaultStatus ?? 'Pendente', project_id: pid, responsible: defaultResponsible ?? '' });
    }
  }, [open, task, defaultStatus, defaultResponsible, projects, fixedProjectId]);

  if (!open) return null;

  const project = projects.find(p => p.id === form.project_id);
  const categoryLabel = project?.name ?? form.project_id ?? '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.activity.trim()) return;
    onSave({
      ...form,
      category: categoryLabel,
      co_responsibles: form.co_responsibles.length > 0 ? JSON.stringify(form.co_responsibles) : null,
      external_collaborators: form.external_collaborators.trim() || null,
      deadline: noDeadline ? null : (form.deadline.trim() || null),
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  }

  const showProjectSelect = fixedProjectId == null;
  const fixedProject = fixedProjectId != null ? projects.find(p => p.id === fixedProjectId) : null;
  const isEdit = !!task;

  const inp: React.CSSProperties = { width: '100%', padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.9rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,0.32)', zIndex: 60 }} />

      {/* Drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 700, maxWidth: '94%', background: 'var(--surface)', overflowY: 'auto', zIndex: 61, borderLeft: '1px solid var(--line-1)', animation: 'drawin .24s cubic-bezier(.4,0,.2,1) both', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', borderBottom: '1px solid var(--line-1)', flexShrink: 0, position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: '#034EA2', flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-2)' }}>
              {isEdit ? 'Editar atividade' : 'Nova atividade'}
            </span>
          </div>
          <button type="button" onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px 28px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Preview card */}
            <div>
              <Label>Pré-visualização</Label>
              <PreviewCard
                activity={form.activity} category={categoryLabel} priority={form.priority}
                status={form.status} responsible={form.responsible} deadline={form.deadline}
                coResps={form.co_responsibles} noDeadline={noDeadline}
              />
            </div>

            {/* Atividade */}
            <div>
              <Label>Atividade <span style={{color: 'rgb(255, 0, 0)'}}>*</span></Label>
              <input value={form.activity} onChange={e => setForm({ ...form, activity: e.target.value })} placeholder="Ex: Revisar roteiro do evento" required style={inp}
                onFocus={e => { e.target.style.borderColor = '#034EA2'; e.target.style.boxShadow = 'inset 0 0 0 1px #034EA2'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
            </div>

            {/* Descrição */}
            <div>
              <Label>Descrição <span style={{color: 'rgb(255, 0, 0)'}}>*</span></Label>
              <RichTextEditor value={form.description} onChange={html => setForm(f => ({ ...f, description: html }))} />
            </div>

            {/* Categoria / Projeto */}
            <div style={{ display: 'grid', gridTemplateColumns: showProjectSelect ? '1fr 1fr' : '1fr', gap: 14 }}>
              {showProjectSelect && (
                <div>
                  <Label>Projeto</Label>
                  <div style={{ position: 'relative' }}>
                    <select value={form.project_id ?? ''} onChange={e => setForm({ ...form, project_id: e.target.value || null })} style={{ ...inp, padding: '11px 32px 11px 13px', appearance: 'none', cursor: 'pointer' }}>
                      <option value="">— Sem projeto —</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
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
                <Label>Responsável</Label>
                <div style={{ position: 'relative' }}>
                  <select value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value, co_responsibles: form.co_responsibles.filter(n => n !== e.target.value) })} style={{ ...inp, padding: '11px 32px 11px 13px', appearance: 'none', cursor: 'pointer' }}>
                    <option value="">— Sem responsável —</option>
                    {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                  <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
            </div>

            {/* Prazo */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <Label>Prazo (opcional)</Label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-2)', cursor: 'pointer', marginTop: -3 }}>
                  <input type="checkbox" checked={noDeadline} onChange={e => { setNoDeadline(e.target.checked); if (e.target.checked) setForm({ ...form, deadline: '' }); }} style={{ accentColor: '#034EA2', cursor: 'pointer', width: 14, height: 14 }} />
                  Indeterminado
                </label>
              </div>
              <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} disabled={noDeadline} style={{ ...inp, opacity: noDeadline ? 0.4 : 1, cursor: noDeadline ? 'not-allowed' : 'text' }}
                onFocus={e => { if (!noDeadline) { e.target.style.borderColor = '#034EA2'; e.target.style.boxShadow = 'inset 0 0 0 1px #034EA2'; } }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
            </div>

            {/* Co-responsáveis */}
            <div>
              <Label>Co-responsáveis</Label>
              <CoRespChips users={users} selected={form.co_responsibles} exclude={form.responsible} onChange={v => setForm({ ...form, co_responsibles: v })} />
            </div>

            {/* Prioridade */}
            <div>
              <Label>Prioridade</Label>
              <Segmented options={PRIORITY_OPTIONS} value={form.priority} onChange={v => setForm({ ...form, priority: v })} getColor={v => PRIO_COLOR[v]} />
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Segmented options={STATUS_OPTIONS} value={form.status} onChange={v => setForm({ ...form, status: v })} />
            </div>

            {/* Colaboração externa */}
            <div>
              <Label>Colaboradores externos</Label>
              <input value={form.external_collaborators} onChange={e => setForm({ ...form, external_collaborators: e.target.value })} placeholder="Nomes separados por vírgula (parceiros, terceiros)" style={inp}
                onFocus={e => { e.target.style.borderColor = '#034EA2'; e.target.style.boxShadow = 'inset 0 0 0 1px #034EA2'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
            </div>

            {/* Anexos */}
            <div>
              <Label>Anexos</Label>
              <AttachmentField attachments={attachments} onChange={setAttachments} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button type="submit" style={{ flex: 1, padding: 12, border: 'none', borderRadius: 3, background: '#034EA2', color: '#fff', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#023e82')}
                onMouseLeave={e => (e.currentTarget.style.background = '#034EA2')}>
                {isEdit ? 'Salvar alterações' : 'Criar atividade'}
              </button>
              <button type="button" onClick={onClose} style={{ padding: '12px 18px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.84rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
