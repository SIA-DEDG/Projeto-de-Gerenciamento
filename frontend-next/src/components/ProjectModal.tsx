'use client';

import { useState, useEffect } from 'react';
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

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-light)', fontSize: '0.85rem',
  fontFamily: 'inherit', background: '#fff', color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box',
};

export default function ProjectModal({ open, project, onClose, onSave, users = [] }: Props) {
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

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.72rem', fontWeight: 700,
    color: 'var(--text-muted)', marginBottom: 5,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(3,78,162,0.22)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 580, maxHeight: '92vh',
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
              {project ? 'Editar projeto' : 'Novo projeto'}
            </div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'inherit' }}>
              {project ? (project.name || 'Editar Projeto') : 'Preencha os dados abaixo'}
            </h2>
          </div>
          <button type="button" onClick={onClose} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>✕</button>
        </div>

        {/* Body */}
        <form id="project-form" onSubmit={handleSubmit} noValidate style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Nome do Projeto *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Modernização do Portal SIA"
                required
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Categoria Principal</label>
              <input
                type="text"
                value={form.category ?? ''}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ex: Comunicação"
                style={inp}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Responsável</label>
              <select
                value={form.owner ?? ''}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                style={inp}
              >
                <option value="">Selecionar responsável</option>
                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Prazo Final</label>
              <input
                type="date"
                value={form.deadline ?? ''}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                style={inp}
              />
            </div>
          </div>

          <div>
            <label style={lbl}>Status Executivo</label>
            <select
              value={form.executive_status ?? 'planejamento'}
              onChange={(e) => setForm({ ...form, executive_status: e.target.value })}
              style={inp}
            >
              <option value="planejamento">Planejamento</option>
              <option value="execucao">Execução</option>
              <option value="validacao">Validação</option>
              <option value="concluido">Concluído</option>
            </select>
          </div>

          <div>
            <label style={lbl}>Objetivo</label>
            <textarea
              rows={2}
              value={form.objective ?? ''}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              placeholder="Descreva o objetivo principal do projeto..."
              style={{ ...inp, resize: 'vertical', minHeight: 60, lineHeight: 1.6 }}
            />
          </div>

          <div>
            <label style={lbl}>Escopo e Entregáveis</label>
            <textarea
              rows={3}
              value={form.scope ?? ''}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              placeholder="Liste escopo, entregáveis e critérios de aceite..."
              style={{ ...inp, resize: 'vertical', minHeight: 72, lineHeight: 1.6 }}
            />
          </div>

          <div>
            <label style={lbl}>Resumo Executivo</label>
            <textarea
              rows={3}
              value={form.summary ?? ''}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Contexto geral para leitura da alta gestão..."
              style={{ ...inp, resize: 'vertical', minHeight: 72, lineHeight: 1.6 }}
            />
          </div>
        </form>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-subtle)', flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ padding: '6px 14px', background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-secondary)' }}>
            Cancelar
          </button>
          <button type="submit" form="project-form" style={{ padding: '6px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {project ? 'Salvar' : 'Criar Projeto'}
          </button>
        </div>
      </div>
    </div>
  );
}
