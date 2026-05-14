'use client';

import { useState, useEffect } from 'react';
import type { Project } from '@/types';

interface Props {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (data: Omit<Project, 'id'>) => void;
}

const EMPTY: Omit<Project, 'id'> = {
  name: '',
  category: '',
  owner: '',
  deadline: '',
  executive_status: 'planejamento',
  objective: '',
  scope: '',
  summary: '',
};

export default function ProjectModal({ open, project, onClose, onSave }: Props) {
  const [form, setForm] = useState<Omit<Project, 'id'>>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (project) {
      const { id, ...rest } = project;
      setForm({ ...EMPTY, ...rest });
    } else {
      setForm(EMPTY);
    }
  }, [open, project]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card modal-card-lg">
        <div className="modal-head">
          <h3>{project ? 'Editar Projeto' : 'Novo Projeto'}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-row">
            <label className="modal-field">
              Nome do Projeto *
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Modernização do Portal SIA"
                required
              />
            </label>
            <label className="modal-field">
              Categoria Principal
              <input
                type="text"
                value={form.category ?? ''}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ex: Comunicação"
              />
            </label>
          </div>

          <div className="modal-row">
            <label className="modal-field">
              Responsável
              <input
                type="text"
                value={form.owner ?? ''}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                placeholder="Ex: Ingrid"
              />
            </label>
            <label className="modal-field">
              Prazo Final
              <input
                type="date"
                value={form.deadline ?? ''}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </label>
          </div>

          <label className="modal-field">
            Status Executivo
            <select
              value={form.executive_status ?? 'planejamento'}
              onChange={(e) => setForm({ ...form, executive_status: e.target.value })}
            >
              <option value="planejamento">Planejamento</option>
              <option value="execucao">Execução</option>
              <option value="validacao">Validação</option>
              <option value="concluido">Concluído</option>
            </select>
          </label>

          <label className="modal-field">
            Objetivo
            <textarea
              rows={2}
              value={form.objective ?? ''}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              placeholder="Descreva o objetivo principal do projeto..."
            />
          </label>

          <label className="modal-field">
            Escopo e Entregáveis
            <textarea
              rows={3}
              value={form.scope ?? ''}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              placeholder="Liste escopo, entregáveis e critérios de aceite..."
            />
          </label>

          <label className="modal-field">
            Resumo Executivo
            <textarea
              rows={3}
              value={form.summary ?? ''}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Contexto geral para leitura da alta gestão..."
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
