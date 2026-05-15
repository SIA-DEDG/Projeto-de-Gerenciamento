'use client';

import { useState, useEffect } from 'react';
import type { Task, Project } from '@/types';

const PIPELINE_OPTIONS = [
  { value: 'Pendente',     label: 'Pendente'     },
  { value: 'Em Andamento', label: 'Em Andamento' },
  { value: 'Concluído',    label: 'Concluído'    },
];

interface Props {
  open: boolean;
  task: Task | null;
  defaultStatus?: string;
  projects: Project[];
  fixedProjectId?: number | null;
  onClose: () => void;
  onSave: (data: {
    activity: string;
    description: string;
    category: string;
    project_id: number | null;
    status: string;
    responsible: string;
    date: string;
  }) => void;
}

const EMPTY = {
  activity: '',
  description: '',
  project_id: null as number | null,
  status: 'Pendente',
  responsible: '',
  date: '',
};

export default function ActivityModal({
  open, task, defaultStatus, projects, fixedProjectId, onClose, onSave,
}: Props) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (task) {
      const sg = task.status_group;
      const mapped = sg === 'done' ? 'Concluído' : sg === 'in_progress' ? 'Em Andamento' : 'Pendente';
      setForm({
        activity:    task.activity,
        description: task.description ?? '',
        project_id:  task.project_id ?? null,
        status:      mapped,
        responsible: task.responsible,
        date:        task.created_at ?? '',
      });
    } else {
      const pid = fixedProjectId ?? projects[0]?.id ?? null;
      setForm({ ...EMPTY, status: defaultStatus ?? 'Pendente', project_id: pid });
    }
  }, [open, task, defaultStatus, projects, fixedProjectId]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.activity.trim()) return;
    const project = projects.find((p) => p.id === form.project_id);
    onSave({ ...form, category: project?.name ?? '' });
  }

  const showProjectSelect = fixedProjectId == null;
  const fixedProject = fixedProjectId != null ? projects.find((p) => p.id === fixedProjectId) : null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="modal-head">
          <h3>{task ? 'Editar Atividade' : 'Nova Atividade'}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {fixedProject && (
          <div style={{ marginBottom: '12px', padding: '6px 10px', background: '#f0f0ff', borderRadius: '4px', fontSize: '0.8rem', color: '#6C5CE7', fontWeight: 600 }}>
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

          <label className="modal-field">
            Descrição
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva a atividade em detalhes..."
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem', padding: '8px 10px', border: '1px solid #dfe1e6', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}
            />
          </label>

          <div className="modal-row">
            {showProjectSelect && (
              <label className="modal-field">
                Projeto
                <select
                  value={form.project_id ?? ''}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">— Sem projeto —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="modal-field">
              Pipeline / Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {PIPELINE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="modal-row">
            <label className="modal-field">
              Responsável
              <input
                type="text"
                value={form.responsible}
                onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                placeholder="Ex: Ingrid"
              />
            </label>
            <label className="modal-field">
              Data
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
