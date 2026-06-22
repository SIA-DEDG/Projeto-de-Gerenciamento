'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { UserPublic } from '@/lib/api';
import type { Project } from '@/types';

interface Props {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (data: Omit<Project, 'id'>) => void;
  users?: UserPublic[];
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

export default function ProjectModal({ open, project, onClose, onSave, users = [] }: Props) {
  const [form, setForm] = useState<Omit<Project, 'id'>>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (project) {
      const { id, ...rest } = project;
      void id;
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
      <div className="modal-card modal-card-lg" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 3 }}>
              {project ? 'Editar projeto' : 'Novo projeto'}
            </div>
            <h2 className="modal-title">{project ? (project.name || 'Editar Projeto') : 'Preencha os dados abaixo'}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form id="project-form" onSubmit={handleSubmit} noValidate className="modal-body">
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Nome do Projeto *</label>
              <input className="form-input" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Modernização do Portal SIA" required />
            </div>
            <div className="form-field">
              <label className="form-label">Categoria</label>
              <input className="form-input" type="text" value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: Comunicação" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Responsável</label>
              <select className="form-select" value={form.owner ?? ''} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
                <option value="">Selecionar responsável</option>
                {users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Prazo Final</label>
              <input className="form-input" type="date" value={form.deadline ?? ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Status Executivo</label>
            <select className="form-select" value={form.executive_status ?? 'planejamento'} onChange={(e) => setForm({ ...form, executive_status: e.target.value })}>
              <option value="planejamento">Planejamento</option>
              <option value="execucao">Execução</option>
              <option value="validacao">Validação</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Objetivo</label>
            <textarea className="form-textarea" rows={2} value={form.objective ?? ''} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Descreva o objetivo principal do projeto..." />
          </div>

          <div className="form-field">
            <label className="form-label">Escopo e Entregáveis</label>
            <textarea className="form-textarea" rows={3} value={form.scope ?? ''} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="Liste escopo, entregáveis e critérios de aceite..." />
          </div>

          <div className="form-field">
            <label className="form-label">Resumo Executivo</label>
            <textarea className="form-textarea" rows={3} value={form.summary ?? ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Contexto geral para leitura da alta gestão..." />
          </div>
        </form>

        <div className="modal-footer" style={{ background: 'var(--surface-2)' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
          <button type="submit" form="project-form" className="btn btn-primary btn-sm">{project ? 'Salvar' : 'Criar Projeto'}</button>
        </div>
      </div>
    </div>
  );
}
