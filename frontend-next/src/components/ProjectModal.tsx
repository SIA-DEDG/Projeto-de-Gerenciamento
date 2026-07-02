'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
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

// ── Status executivo: rótulo ↔ código ──────────────────────────────────────────
const STATUS_LABELS = ['Planejamento', 'Execução', 'Validação', 'Concluído'];
const LABEL_TO_CODE: Record<string, string> = {
  'Planejamento': 'planejamento', 'Execução': 'execucao', 'Validação': 'validacao', 'Concluído': 'concluido',
};
const CODE_TO_LABEL: Record<string, string> = {
  planejamento: 'Planejamento', execucao: 'Execução', validacao: 'Validação', concluido: 'Concluído',
};

// ── Label helper ────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
      {children}
    </div>
  );
}

// ── Segmented control ────────────────────────────────────────────────────────────
function Segmented({ options, value, onChange }: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
      {options.map((opt, i) => {
        const active = value === opt;
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            style={{
              flex: 1, padding: '9px 6px', fontSize: '0.78rem',
              fontWeight: active ? 600 : 500, fontFamily: 'inherit', cursor: 'pointer',
              border: 'none', borderRight: i < options.length - 1 ? '1px solid var(--border)' : 'none',
              background: active ? 'var(--blue)' : 'var(--surface)',
              color: active ? '#fff' : 'var(--text-2)',
              transition: 'background 0.12s, color 0.12s',
            }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────────
export default function ProjectModal({ open, project, onClose, onSave, users = [] }: Props) {
  const [form, setForm] = useState<Omit<Project, 'id'>>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (project) {
      const { id, ...rest } = project;
      void id;
      setForm({ ...EMPTY, ...rest, deadline: rest.deadline ? rest.deadline.slice(0, 10) : '' });
    } else {
      setForm(EMPTY);
    }
  }, [open, project]);

  if (!open) return null;

  const isEdit = !!project;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

  const focusBlue = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; },
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,0.32)', zIndex: 60 }} />

      {/* Drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 700, maxWidth: '94%', background: 'var(--surface)', overflowY: 'auto', zIndex: 61, borderLeft: '1px solid var(--line-1)', animation: 'drawin .24s cubic-bezier(.4,0,.2,1) both', display: 'flex', flexDirection: 'column' }}>

        {/* Stripe Gov-PI */}
        <div style={{ height: 4, flexShrink: 0, background: 'linear-gradient(90deg,var(--blue) 0 40%,#E0A92E 40% 55%,#b42318 55% 75%,#1B8A4B 75%)' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--line-1)', flexShrink: 0, position: 'sticky', top: 4, background: 'var(--surface)', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--blue)', flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-2)' }}>
              {isEdit ? 'Editar projeto' : 'Novo projeto'}
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

            {/* Nome */}
            <div>
              <Label>Nome do projeto <span style={{ color: 'rgb(255, 0, 0)' }}>*</span></Label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Modernização do Portal SIA" required style={inp} {...focusBlue} />
            </div>

            {/* Grid: Categoria | Responsável */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <Label>Categoria</Label>
                <input value={form.category ?? ''} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: Comunicação" style={inp} {...focusBlue} />
              </div>
              <div>
                <Label>Responsável</Label>
                <div style={{ position: 'relative' }}>
                  <select value={form.owner ?? ''} onChange={e => setForm({ ...form, owner: e.target.value })} style={{ ...inp, padding: '11px 32px 11px 13px', appearance: 'none', cursor: 'pointer' }}>
                    <option value="">— Sem responsável —</option>
                    {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} />
                </div>
              </div>
            </div>

            {/* Status executivo */}
            <div>
              <Label>Status executivo</Label>
              <Segmented
                options={STATUS_LABELS}
                value={CODE_TO_LABEL[form.executive_status ?? 'planejamento'] ?? 'Planejamento'}
                onChange={v => setForm({ ...form, executive_status: LABEL_TO_CODE[v] })}
              />
            </div>

            {/* Prazo final */}
            <div>
              <Label>Prazo final</Label>
              <input type="date" value={form.deadline ?? ''} onChange={e => setForm({ ...form, deadline: e.target.value })} style={inp} {...focusBlue} />
            </div>

            {/* Objetivo */}
            <div>
              <Label>Objetivo</Label>
              <textarea rows={2} value={form.objective ?? ''} onChange={e => setForm({ ...form, objective: e.target.value })} placeholder="Descreva o objetivo principal do projeto..." style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} {...focusBlue} />
            </div>

            {/* Escopo */}
            <div>
              <Label>Escopo e entregáveis</Label>
              <textarea rows={3} value={form.scope ?? ''} onChange={e => setForm({ ...form, scope: e.target.value })} placeholder="Liste escopo, entregáveis e critérios de aceite..." style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} {...focusBlue} />
            </div>

            {/* Resumo */}
            <div>
              <Label>Resumo executivo</Label>
              <textarea rows={3} value={form.summary ?? ''} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Contexto geral para leitura da alta gestão..." style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} {...focusBlue} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button type="submit" style={{ flex: 1, padding: 12, border: 'none', borderRadius: 3, background: 'var(--blue)', color: '#fff', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-h)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--blue)')}>
                {isEdit ? 'Salvar alterações' : 'Criar projeto'}
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
