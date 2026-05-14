'use client';

import { useState, useEffect } from 'react';
import type { Task, Category } from '@/types';

const PIPELINE_OPTIONS = [
  { value: 'Pendente', label: 'Pendente' },
  { value: 'Em Andamento', label: 'Em Andamento' },
  { value: 'Concluído', label: 'Concluído' },
];

interface Props {
  open: boolean;
  task: Task | null;
  defaultStatus?: string;
  categories: Category[];
  onClose: () => void;
  onSave: (data: {
    activity: string;
    category: string;
    status: string;
    responsible: string;
    date: string;
  }) => void;
}

const EMPTY = {
  activity: '',
  category: '',
  status: 'Pendente',
  responsible: '',
  date: '',
};

export default function ActivityModal({ open, task, defaultStatus, categories, onClose, onSave }: Props) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (task) {
      const sg = task.status_group;
      const mapped = sg === 'done' ? 'Concluído' : sg === 'in_progress' ? 'Em Andamento' : 'Pendente';
      setForm({
        activity: task.activity,
        category: task.category,
        status: mapped,
        responsible: task.responsible,
        date: task.created_at ?? '',
      });
    } else {
      setForm({ ...EMPTY, status: defaultStatus ?? 'Pendente', category: categories[0]?.name ?? '' });
    }
  }, [open, task, defaultStatus, categories]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.activity.trim()) return;
    onSave(form);
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="modal-head">
          <h3>{task ? 'Editar Atividade' : 'Nova Atividade'}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

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

          <div className="modal-row">
            <label className="modal-field">
              Categoria
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </label>
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
