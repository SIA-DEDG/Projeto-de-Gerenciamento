'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Task, Project } from '@/types';
import type { UserPublic } from '@/lib/api';
import RichTextEditor from './RichTextEditor';

const PIPELINE_OPTIONS = [
  { value: 'Pendente',     label: 'Pendente'     },
  { value: 'Em Andamento', label: 'Em Andamento' },
  { value: 'Concluído',    label: 'Concluído'    },
];

const PRIORITY_OPTIONS = [
  { value: 'Baixa', label: 'Baixa', color: '#007932', bg: '#e8f7ee' },
  { value: 'Média', label: 'Média', color: '#c07800', bg: '#fff8e0' },
  { value: 'Alta',  label: 'Alta',  color: '#ef4123', bg: '#fff0ed' },
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

// ── Multi-select dropdown ─────────────────────────────────────────────────────
function CoResponsaveisSelect({
  users,
  selected,
  exclude,
  onChange,
}: {
  users: UserPublic[];
  selected: string[];
  exclude: string;
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const available = users.filter((user) => user.name !== exclude);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function toggle(name: string) {
    onChange(selected.includes(name) ? selected.filter((selectedName) => selectedName !== name) : [...selected, name]);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        style={{
          width: '100%', textAlign: 'left', padding: '8px 10px',
          border: '1px solid #dfe1e6', borderRadius: '4px',
          background: '#fff', fontSize: '0.9rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: 36,
          fontFamily: 'inherit',
        }}
      >
        {selected.length === 0 ? (
          <span style={{ color: '#adb5bd' }}>— Nenhum —</span>
        ) : (
          selected.map((name) => (
            <span key={name} style={{
              background: '#e8f0fe', color: '#0052cc', borderRadius: 4,
              padding: '2px 6px', fontSize: '0.78rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {name}
              <span
                onClick={(e) => { e.stopPropagation(); toggle(name); }}
                style={{ cursor: 'pointer', lineHeight: 1 }}
              >×</span>
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
          ) : available.map((user) => (
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

// ─────────────────────────────────────────────────────────────────────────────

export default function ActivityModal({
  open, task, defaultStatus, defaultResponsible, projects, users, fixedProjectId, onClose, onSave,
}: Props) {
  const [form, setForm] = useState(EMPTY);
  const [noDeadline, setNoDeadline] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (task) {
      const sg = task.status_group;
      const mapped = sg === 'done' ? 'Concluído' : sg === 'in_progress' ? 'Em Andamento' : 'Pendente';
      let coResponsibles: string[] = [];
      try { coResponsibles = task.co_responsibles ? JSON.parse(task.co_responsibles) : []; } catch { coResponsibles = []; }
      setNoDeadline(!task.deadline);
      setForm({
        activity:               task.activity,
        description:            task.description ?? '',
        project_id:             task.project_id ?? null,
        status:                 mapped,
        responsible:            task.responsible,
        date:                   task.date ?? '',
        priority:               task.priority ?? 'Média',
        co_responsibles:        coResponsibles,
        external_collaborators: task.external_collaborators ?? '',
        deadline:               task.deadline ?? '',
      });
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
    const project = projects.find((proj) => proj.id === form.project_id);
    onSave({
      ...form,
      category:               project?.name ?? '',
      co_responsibles:        form.co_responsibles.length > 0 ? JSON.stringify(form.co_responsibles) : null,
      external_collaborators: form.external_collaborators.trim() || null,
      deadline:               noDeadline ? null : (form.deadline.trim() || null),
    });
  }

  const showProjectSelect = fixedProjectId == null;
  const fixedProject = fixedProjectId != null ? projects.find((proj) => proj.id === fixedProjectId) : null;

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-light)', fontSize: '0.85rem',
    fontFamily: 'inherit', background: '#fff', color: 'var(--text-primary)',
    outline: 'none', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.72rem', fontWeight: 700,
    color: 'var(--text-muted)', marginBottom: 5,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(3,78,162,0.22)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{
        background: '#fff', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 520, maxHeight: '90vh',
        boxShadow: '0 20px 60px rgba(3,78,162,0.18), 0 4px 16px rgba(0,0,0,0.10)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'modal-pop-in-flex 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards',
      }}>
        {/* Piauí flag stripe */}
        <div style={{ height: 5, flexShrink: 0, background: 'linear-gradient(to right, #034ea2 40%, #fdb913 40% 55%, #ef4123 55% 75%, #007932 75%)' }} />

        {/* Header */}
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>
              {task ? 'Editar atividade' : 'Nova atividade'}
            </div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'inherit' }}>
              {task ? (task.activity || 'Editar Atividade') : 'Preencha os dados abaixo'}
            </h2>
          </div>
          <button type="button" onClick={onClose} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>✕</button>
        </div>

        {/* Scrollable body */}
        <form id="activity-form" onSubmit={handleSubmit} noValidate style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {fixedProject && (
            <div style={{ padding: '6px 10px', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
              Projeto: {fixedProject.name}
            </div>
          )}

          <div>
            <label style={lbl}>Título da Atividade *</label>
            <input
              type="text"
              value={form.activity}
              onChange={(e) => setForm({ ...form, activity: e.target.value })}
              placeholder="O que precisa ser feito?"
              required
              style={inp}
            />
          </div>

          <div>
            <label style={lbl}>Descrição</label>
            <div style={{ marginTop: 4 }}>
              <RichTextEditor
                value={form.description}
                onChange={(html) => setForm((f) => ({ ...f, description: html }))}
              />
            </div>
          </div>

          <div>
            <label style={lbl}>Prioridade</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORITY_OPTIONS.map((opt) => {
                const active = form.priority === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, priority: opt.value })}
                    style={{
                      flex: 1, padding: '7px 4px',
                      border: `2px solid ${active ? opt.color : 'var(--border-light)'}`,
                      borderRadius: 'var(--radius-sm)',
                      background: active ? opt.bg : '#fafbfc',
                      color: active ? opt.color : 'var(--text-muted)',
                      fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: opt.color, display: 'inline-block', flexShrink: 0 }} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: showProjectSelect ? '1fr 1fr' : '1fr', gap: 12 }}>
            {showProjectSelect && (
              <div>
                <label style={lbl}>Projeto</label>
                <select value={form.project_id ?? ''} onChange={(e) => setForm({ ...form, project_id: e.target.value || null })} style={inp}>
                  <option value="">— Sem projeto —</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={lbl}>Pipeline / Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={inp}>
                {PIPELINE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Responsável principal</label>
              <select value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value, co_responsibles: form.co_responsibles.filter((n) => n !== e.target.value) })} style={inp}>
                <option value="">— Sem responsável —</option>
                {users.map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Data</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inp} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ ...lbl, marginBottom: 0 }}>Prazo de Finalização</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={noDeadline}
                  onChange={(e) => { setNoDeadline(e.target.checked); if (e.target.checked) setForm({ ...form, deadline: '' }); }}
                  style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                Indeterminado
              </label>
            </div>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              disabled={noDeadline}
              style={{ ...inp, opacity: noDeadline ? 0.4 : 1 }}
            />
          </div>

          <div>
            <label style={lbl}>Co-responsáveis</label>
            <div style={{ marginTop: 4 }}>
              <CoResponsaveisSelect
                users={users}
                selected={form.co_responsibles}
                exclude={form.responsible}
                onChange={(v) => setForm({ ...form, co_responsibles: v })}
              />
            </div>
          </div>

          <div>
            <label style={lbl}>Colaboração externa</label>
            <input
              type="text"
              value={form.external_collaborators}
              onChange={(e) => setForm({ ...form, external_collaborators: e.target.value })}
              placeholder="Nomes externos, separados por vírgula"
              style={inp}
            />
          </div>
        </form>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-subtle)', flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ padding: '6px 14px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-secondary)' }}>Cancelar</button>
          <button type="submit" form="activity-form" style={{ padding: '6px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{task ? 'Salvar' : 'Criar'}</button>
        </div>
      </div>
    </div>
  );
}
