'use client';

import { useState } from 'react';
import type { Category } from '@/types';

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' },
  { value: 'orange', label: 'Laranja' },
  { value: 'red', label: 'Vermelho' },
  { value: 'purple', label: 'Roxo' },
  { value: 'teal', label: 'Turquesa' },
  { value: 'yellow', label: 'Amarelo' },
];

interface Props {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onChange: (categories: Category[]) => void;
}

export default function CategoryModal({ open, categories, onClose, onChange }: Props) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('blue');

  if (!open) return null;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (categories.find((c) => c.name === name)) return;
    onChange([...categories, { name, color: newColor }]);
    setNewName('');
    setNewColor('blue');
  }

  function handleRemove(name: string) {
    if (!confirm(`Excluir categoria "${name}"? As atividades vinculadas ficarão sem categoria.`)) return;
    onChange(categories.filter((c) => c.name !== name));
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="modal-head">
          <h3>Gerenciar Categorias</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div style={{ marginBottom: '16px', maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {categories.length === 0 ? (
            <p style={{ color: '#6b778c', fontSize: '0.85rem' }}>Nenhuma categoria cadastrada.</p>
          ) : (
            categories.map((c) => (
              <div
                key={c.name}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid #dfe1e6', borderRadius: '4px', background: '#fafbfc' }}
              >
                <span className={`jira-badge jira-badge-${c.color}`}>{c.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(c.name)}
                  style={{ background: '#ffebe6', border: 'none', color: '#de350b', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  Excluir
                </button>
              </div>
            ))
          )}
        </div>

        <form style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} onSubmit={handleAdd}>
          <input
            type="text"
            required
            placeholder="Nome da categoria..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1, minWidth: '120px', padding: '9px 10px', border: '1px solid #dfe1e6', borderRadius: '4px', fontFamily: 'inherit' }}
          />
          <select
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            style={{ padding: '9px 10px', border: '1px solid #dfe1e6', borderRadius: '4px', fontFamily: 'inherit' }}
          >
            {COLOR_OPTIONS.map((col) => (
              <option key={col.value} value={col.value}>{col.label}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">+ Adicionar</button>
        </form>
      </div>
    </div>
  );
}
