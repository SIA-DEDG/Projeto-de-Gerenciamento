'use client';

import { useState, useEffect, useRef } from 'react';
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
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2" style={{ marginLeft: 'auto', flexShrink: 0, color: '#6b778c', transform: open ? 'rotate(180deg)' : undefined }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
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

  useEffect(() => {
    if (!open) return;
    if (task) {
      const sg = task.status_group;
      const mapped = sg === 'done' ? 'Concluído' : sg === 'in_progress' ? 'Em Andamento' : 'Pendente';
      let coResponsibles: string[] = [];
      try { coResponsibles = task.co_responsibles ? JSON.parse(task.co_responsibles) : []; } catch { coResponsibles = []; }
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
      deadline:               form.deadline.trim() || null,
    });
  }

  const showProjectSelect = fixedProjectId == null;
  const fixedProject = fixedProjectId != null ? projects.find((proj) => proj.id === fixedProjectId) : null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="modal-head">
          <h3>{task ? 'Editar Atividade' : 'Nova Atividade'}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {fixedProject && (
          <div style={{ marginBottom: '12px', padding: '6px 10px', background: '#eef3fa', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
            Projeto: {fixedProject.name}
          </div>
        )}

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="modal-field">
            Título da Atividade *
            <input
              type="text"
              value={form.activity}
              onChange={(e) => setForm({ ...form, activity: e.target.value })}
              placeholder="O que precisa ser feito?"
              required
            />
          </label>

          <div className="modal-field">
            <span>Descrição</span>
            <div style={{ marginTop: 6 }}>
              <RichTextEditor
                value={form.description}
                onChange={(html) => setForm((f) => ({ ...f, description: html }))}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="modal-field">
            <span>Prioridade</span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {PRIORITY_OPTIONS.map((opt) => {
                const active = form.priority === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, priority: opt.value })}
                    style={{
                      flex: 1, padding: '8px 4px',
                      border: `2px solid ${active ? opt.color : '#dfe1e6'}`,
                      borderRadius: '8px',
                      background: active ? opt.bg : '#fafbfc',
                      color: active ? opt.color : '#6b778c',
                      fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                      transition: 'all 0.14s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
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

          <div className="modal-row">
            {showProjectSelect && (
              <label className="modal-field">
                Projeto
                <select value={form.project_id ?? ''} onChange={(e) => setForm({ ...form, project_id: e.target.value || null })}>
                  <option value="">— Sem projeto —</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
            )}
            <label className="modal-field">
              Pipeline / Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {PIPELINE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <div className="modal-row">
            <label className="modal-field">
              Responsável principal
              <select value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value, co_responsibles: form.co_responsibles.filter((n) => n !== e.target.value) })}>
                <option value="">— Sem responsável —</option>
                {users.map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}
              </select>
            </label>
            <label className="modal-field">
              Data
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
          </div>

          <label className="modal-field">
            Prazo de Finalização
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </label>

          {/* Co-responsáveis */}
          <div className="modal-field">
            <span>Co-responsáveis</span>
            <div style={{ marginTop: 6 }}>
              <CoResponsaveisSelect
                users={users}
                selected={form.co_responsibles}
                exclude={form.responsible}
                onChange={(v) => setForm({ ...form, co_responsibles: v })}
              />
            </div>
          </div>

          {/* Colaboração externa */}
          <label className="modal-field">
            Colaboração externa
            <input
              type="text"
              value={form.external_collaborators}
              onChange={(e) => setForm({ ...form, external_collaborators: e.target.value })}
              placeholder="Nomes externos, separados por vírgula"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
