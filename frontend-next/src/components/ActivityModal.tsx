'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { Task, Project } from '@/types';
import type { UserPublic } from '@/lib/api';
import RichTextEditor from './RichTextEditor';

const PIPELINE_OPTIONS = [
  { value: 'Pendente',    label: 'Pendente' },
  { value: 'Em Andamento',label: 'Em Andamento' },
  { value: 'Em Revisão',  label: 'Em Revisão' },
  { value: 'Concluído',   label: 'Concluído' },
];

const PRIORITY_OPTIONS = [
  { value: 'Baixa', color: 'var(--green-t)', bg: 'rgba(27,138,75,0.08)' },
  { value: 'Média', color: 'var(--gold-t)',  bg: 'rgba(224,169,46,0.1)' },
  { value: 'Alta',  color: 'var(--red)',     bg: 'rgba(180,35,24,0.08)' },
];

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
  }) => void;
}

const EMPTY = {
  activity: '',
  description: '',
  project_id: null as string | null,
  status: 'Pendente',
  responsible: '',
  date: '',
  priority: 'Média',
  co_responsibles: [] as string[],
  external_collaborators: '',
  deadline: '',
};

function CoResponsaveisSelect({
  users, selected, exclude, onChange,
}: {
  users: UserPublic[];
  selected: string[];
  exclude: string;
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const available = users.filter((u) => u.name !== exclude);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function toggle(name: string) {
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="form-input"
        style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', minHeight: 36, cursor: 'pointer', textAlign: 'left' }}
      >
        {selected.length === 0 ? (
          <span style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>— Nenhum —</span>
        ) : selected.map((name) => (
          <span key={name} style={{ background: 'rgba(3,78,162,0.08)', color: 'var(--blue)', borderRadius: 2, padding: '1px 6px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
            {name}
            <span onClick={(e) => { e.stopPropagation(); toggle(name); }} style={{ cursor: 'pointer', lineHeight: 1 }}>×</span>
          </span>
        ))}
        <ChevronDown size={12} style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--text-3)', transform: open ? 'rotate(180deg)' : undefined }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 180, overflowY: 'auto', marginTop: 2 }}>
          {available.length === 0
            ? <div style={{ padding: '10px 12px', color: 'var(--text-3)', fontSize: '0.82rem' }}>Nenhum usuário disponível</div>
            : available.map((u) => (
              <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', background: selected.includes(u.name) ? 'rgba(3,78,162,0.04)' : 'transparent' }}>
                <input type="checkbox" checked={selected.includes(u.name)} onChange={() => toggle(u.name)} style={{ accentColor: 'var(--blue)', cursor: 'pointer' }} />
                {u.name}
                <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-3)' }}>{u.role}</span>
              </label>
            ))
          }
        </div>
      )}
    </div>
  );
}

export default function ActivityModal({
  open, task, defaultStatus, defaultResponsible, projects, users, fixedProjectId, onClose, onSave,
}: Props) {
  const [form, setForm] = useState(EMPTY);
  const [noDeadline, setNoDeadline] = useState(false);

  useEffect(() => {
    if (!open) return;
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.activity.trim()) return;
    if (!form.description.replace(/<[^>]*>/g, '').trim()) return;
    const project = projects.find((p) => p.id === form.project_id);
    onSave({ ...form, category: project?.name ?? '', co_responsibles: form.co_responsibles.length > 0 ? JSON.stringify(form.co_responsibles) : null, external_collaborators: form.external_collaborators.trim() || null, deadline: noDeadline ? null : (form.deadline.trim() || null) });
  }

  const showProjectSelect = fixedProjectId == null;
  const fixedProject = fixedProjectId != null ? projects.find((p) => p.id === fixedProjectId) : null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card modal-card-lg" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 3 }}>
              {task ? 'Editar atividade' : 'Nova atividade'}
            </div>
            <h2 className="modal-title">{task ? (task.activity || 'Editar Atividade') : 'Preencha os dados abaixo'}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form id="activity-form" onSubmit={handleSubmit} noValidate className="modal-body">
          {fixedProject && (
            <div style={{ padding: '5px 10px', background: 'rgba(3,78,162,0.06)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 600 }}>
              Projeto: {fixedProject.name}
            </div>
          )}

          <div className="form-field">
            <label className="form-label">Título da Atividade *</label>
            <input className="form-input" type="text" value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} placeholder="O que precisa ser feito?" required />
          </div>

          <div className="form-field">
            <label className="form-label">Descrição *</label>
            <RichTextEditor value={form.description} onChange={(html) => setForm((f) => ({ ...f, description: html }))} />
          </div>

          {/* Prioridade */}
          <div className="form-field">
            <label className="form-label">Prioridade</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {PRIORITY_OPTIONS.map((opt) => {
                const active = form.priority === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setForm({ ...form, priority: opt.value })}
                    style={{ flex: 1, padding: '6px 4px', border: `1px solid ${active ? opt.color : 'var(--border)'}`, borderRadius: 'var(--radius)', background: active ? opt.bg : 'var(--surface)', color: active ? opt.color : 'var(--text-2)', fontWeight: active ? 700 : 500, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                    {opt.value}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={showProjectSelect ? 'form-row' : undefined}>
            {showProjectSelect && (
              <div className="form-field">
                <label className="form-label">Projeto</label>
                <select className="form-select" value={form.project_id ?? ''} onChange={(e) => setForm({ ...form, project_id: e.target.value || null })}>
                  <option value="">— Sem projeto —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-field">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {PIPELINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Responsável principal</label>
              <select className="form-select" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value, co_responsibles: form.co_responsibles.filter((n) => n !== e.target.value) })}>
                <option value="">— Sem responsável —</option>
                {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Data</label>
              <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>

          <div className="form-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Prazo de Finalização</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={noDeadline} onChange={(e) => { setNoDeadline(e.target.checked); if (e.target.checked) setForm({ ...form, deadline: '' }); }} style={{ accentColor: 'var(--blue)', cursor: 'pointer' }} />
                Indeterminado
              </label>
            </div>
            <input className="form-input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} disabled={noDeadline} style={{ opacity: noDeadline ? 0.4 : 1 }} />
          </div>

          <div className="form-field">
            <label className="form-label">Co-responsáveis</label>
            <CoResponsaveisSelect users={users} selected={form.co_responsibles} exclude={form.responsible} onChange={(v) => setForm({ ...form, co_responsibles: v })} />
          </div>

          <div className="form-field">
            <label className="form-label">Colaboração externa</label>
            <input className="form-input" type="text" value={form.external_collaborators} onChange={(e) => setForm({ ...form, external_collaborators: e.target.value })} placeholder="Nomes externos, separados por vírgula" />
          </div>
        </form>

        <div className="modal-footer" style={{ background: 'var(--surface-2)' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
          <button type="submit" form="activity-form" className="btn btn-primary btn-sm">{task ? 'Salvar' : 'Criar'}</button>
        </div>
      </div>
    </div>
  );
}
