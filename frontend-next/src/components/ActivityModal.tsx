'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Clock, ChevronDown } from 'lucide-react';
import type { Task, Project } from '@/types';
import type { UserPublic } from '@/lib/api';
import { STATUS_COLORS, PRIORITY_COLORS, statusGroup, isProjectMember, mergeUsersById } from '@/lib/utils';
import { getUser } from '@/lib/auth';
import RichTextEditor from './RichTextEditor';
import ConfirmModal from './ConfirmModal';
import AttachmentsEditor, { emptyAttachmentDraft, attachmentDraftDirty, attachmentDraftPayload, type AttachmentDraft } from './AttachmentsEditor';
import CollapsibleGroup from './CollapsibleGroup';
import OtherDiretoriaPicker from './OtherDiretoriaPicker';

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
    // IDs já resolvidos (inclui membros de outra diretoria envolvida) — o board usa estes
    // quando presentes, em vez de resolver os nomes só pela própria diretoria.
    responsible_id?: string | null;
    co_responsible_ids?: string[];
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
  open, task, defaultStatus, defaultResponsible, projects, users, fixedProjectId, onClose, onSave,
}: Props) {
  const [form, setForm] = useState(EMPTY);
  const [noDeadline, setNoDeadline] = useState(false);
  const [attDraft, setAttDraft] = useState<AttachmentDraft>(emptyAttachmentDraft());
  const [confirmClose, setConfirmClose] = useState(false);
  // Membros de outra diretoria trazidos pelo "Envolver outra diretoria" (compartilhamento).
  const [extraUsers, setExtraUsers] = useState<UserPublic[]>([]);
  // Snapshot do form no momento da abertura, para detectar alterações não salvas.
  const initialSnapshot = useRef('');
  // Mapa nome->id dos envolvidos JÁ salvos na task (inclui os de OUTRA diretoria, que
  // podem não estar em `availableUsers`). Usado como fallback ao resolver nomes no save,
  // para não descartar responsável/co-responsável de outra diretoria ao atualizar.
  const existingIdByName = useRef<Map<string, string>>(new Map());

  // Semeia com os envolvidos JÁ salvos (responsável + co-responsáveis: nomes + ids que a
  // task carrega), para que quem é de OUTRA diretoria apareça no select/lista ao reabrir,
  // mesmo sem re-"envolver" a diretoria dele — senão parece que sumiu.
  const seededUsers = useMemo<UserPublic[]>(() => {
    if (!task) return [];
    const seed = (id?: string | null, name?: string | null): UserPublic | null =>
      id ? { id, name: name ?? '(usuário)', username: '', role: '', must_change_password: false, created_at: '', directoria_id: null, directoria_name: null, directoria_color: null } : null;
    const out: UserPublic[] = [];
    const r = seed(task.responsible_id, task.responsible); if (r) out.push(r);
    try {
      const names: string[] = task.co_responsibles ? JSON.parse(task.co_responsibles) : [];
      const ids: string[] = task.co_responsible_ids ? JSON.parse(task.co_responsible_ids) : [];
      names.forEach((n, i) => { const s = seed(ids[i], n); if (s) out.push(s); });
    } catch { /* ids ausentes */ }
    return out;
  }, [task]);

  // Usuários selecionáveis = envolvidos já salvos + própria diretoria + diretoria envolvida.
  // Os reais (com role/diretoria) prevalecem sobre os "seed" (só id+nome).
  const availableUsers = useMemo(
    () => mergeUsersById(mergeUsersById(seededUsers, users), extraUsers),
    [seededUsers, users, extraUsers],
  );

  useEffect(() => {
    if (!open) return;
    setAttDraft(emptyAttachmentDraft());
    setConfirmClose(false);
    setExtraUsers([]);
    existingIdByName.current = new Map();
    let formInit: typeof EMPTY;
    let noDeadlineInit: boolean;
    if (task) {
      const sg = task.status_group;
      const mapped = sg === 'done' ? 'Concluído' : sg === 'review' ? 'Em Revisão' : sg === 'in_progress' ? 'Em Andamento' : 'Pendente';
      let co: string[] = [];
      try { co = task.co_responsibles ? JSON.parse(task.co_responsibles) : []; } catch { co = []; }
      // Preserva os ids dos envolvidos já salvos (inclusive de outra diretoria).
      if (task.responsible && task.responsible_id) existingIdByName.current.set(task.responsible, task.responsible_id);
      try {
        const coIds: string[] = task.co_responsible_ids ? JSON.parse(task.co_responsible_ids) : [];
        co.forEach((n, i) => { if (coIds[i]) existingIdByName.current.set(n, coIds[i]); });
      } catch { /* ids ausentes: resolve por nome no save */ }
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

  const myId = getUser()?.user_id ?? null;

  if (!open) return null;

  const project = projects.find(p => p.id === form.project_id);
  const categoryLabel = project?.name ?? form.project_id ?? '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.activity.trim()) return;
    const payload = attachmentDraftPayload(attDraft); // dobra link digitado mas não adicionado
    // Resolve nome -> id usando availableUsers (própria diretoria + outra diretoria envolvida)
    // e, como fallback, os ids já salvos na task — assim envolvidos de outra diretoria não
    // são descartados ao atualizar mesmo que não estejam na lista carregada pelo board.
    const resolveId = (name: string) =>
      availableUsers.find(u => u.name === name)?.id ?? existingIdByName.current.get(name);
    onSave({
      ...form,
      category: categoryLabel,
      responsible_id: resolveId(form.responsible) ?? null,
      co_responsible_ids: form.co_responsibles
        .map(resolveId)
        .filter((id): id is string => !!id),
      co_responsibles: form.co_responsibles.length > 0 ? JSON.stringify(form.co_responsibles) : null,
      external_collaborators: form.external_collaborators.trim() || null,
      deadline: noDeadline ? null : (form.deadline.trim() || null),
      attachments: payload.attachmentsToAdd,
      links: payload.linksToAdd,
      removedAttachmentIndices: payload.removedAttachmentIndices,
    });
  }

  // Há algo digitado/alterado que seria perdido ao fechar?
  function isDirty(): boolean {
    return JSON.stringify({ form, noDeadline }) !== initialSnapshot.current || attachmentDraftDirty(attDraft);
  }

  function requestClose() {
    if (isDirty()) setConfirmClose(true);
    else onClose();
  }

  const showProjectSelect = fixedProjectId == null;
  const fixedProject = fixedProjectId != null ? projects.find(p => p.id === fixedProjectId) : null;
  const isEdit = !!task;

  // Ao criar/editar, só aparecem os projetos que LHE PERTENCEM (você é responsável ou
  // colaborador) — mesmo para Admin/Diretor. A visão de todos fica no dashboard geral.
  // Mantém o já selecionado visível para não sumir ao editar uma atividade existente.
  const visibleProjects = projects.filter(
    p => isProjectMember(p, myId) || p.id === form.project_id,
  );

  const inp: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

  return (
    <>
      {/* Backdrop */}
      <div onClick={requestClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,0.32)', zIndex: 60 }} />

      {/* Drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 700, maxWidth: '94%', background: 'var(--surface)', overflowY: 'auto', zIndex: 61, borderLeft: '1px solid var(--line-1)', animation: 'drawin .24s cubic-bezier(.4,0,.2,1) both', display: 'flex', flexDirection: 'column' }}>

        {/* Stripe Gov-PI */}
        {/* Faixa Gov-PI comentada a pedido: <div style={{ height: 4, flexShrink: 0, background: 'linear-gradient(90deg,var(--blue-fixed) 0 40%,#E0A92E 40% 55%,#b42318 55% 75%,#1B8A4B 75%)' }} /> */}

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
                  <Label>Projeto</Label>
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
                    {availableUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} />
                </div>
              </div>
              <div>
                <Label>Criado em</Label>
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
              <div style={{ marginBottom: 8 }}>
                <OtherDiretoriaPicker onMembersChange={setExtraUsers} />
              </div>
              <CoRespChips users={availableUsers} selected={form.co_responsibles} exclude={form.responsible} onChange={v => setForm({ ...form, co_responsibles: v })} />
            </div>

            {/* Colaboração externa */}
            <div>
              <Label>Colaboradores externos</Label>
              <input value={form.external_collaborators} onChange={e => setForm({ ...form, external_collaborators: e.target.value })} placeholder="Nomes separados por vírgula (parceiros, terceiros)" style={inp}
                onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
            </div>

            {/* Arquivos e links — componente padronizado (anexar ao criar/editar; remover só aqui) */}
            <CollapsibleGroup label="Arquivos e links" count={(task?.attachments ?? []).length} defaultOpen={false}>
              <AttachmentsEditor existing={task?.attachments ?? []} value={attDraft} onChange={setAttDraft} />
            </CollapsibleGroup>

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

      {/* Alterações não salvas ao tentar sair */}
      <ConfirmModal
        open={confirmClose}
        title="Tem certeza que quer sair?"
        message="Você vai perder tudo que preencheu até agora."
        confirmLabel="Sair"
        cancelLabel="Continuar"
        danger
        onConfirm={onClose}
        onClose={() => setConfirmClose(false)}
      />
    </>
  );
}
