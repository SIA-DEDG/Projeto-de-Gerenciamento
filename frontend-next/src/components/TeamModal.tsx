'use client';

import { useState } from 'react';
import type { TeamMember } from '@/types';

interface Props {
  open: boolean;
  members: TeamMember[];
  onClose: () => void;
  onChange: (members: TeamMember[]) => void;
}

export default function TeamModal({ open, members, onClose, onChange }: Props) {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');

  if (!open) return null;

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    onChange([...members, { name, role: newRole.trim() }]);
    setNewName('');
    setNewRole('');
  }

  function handleRemove(name: string) {
    onChange(members.filter((member) => member.name !== name));
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="modal-head">
          <h3>Gerenciar Equipe</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="manage-list">
          {members.map((member) => (
            <div key={member.name} className="manage-item">
              <div className="manage-item-info">
                <span className="manage-item-name">{member.name}</span>
                {member.role && <span className="manage-item-role">{member.role}</span>}
              </div>
              <button
                type="button"
                className="btn-danger btn-sm"
                onClick={() => handleRemove(member.name)}
              >
                Remover
              </button>
            </div>
          ))}
          {members.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '16px' }}>
              Nenhum membro cadastrado.
            </p>
          )}
        </div>

        <div className="manage-add-form">
          <input
            type="text"
            placeholder="Nome"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          />
          <input
            type="text"
            placeholder="Cargo (opcional)"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          />
          <button type="button" className="btn-primary" onClick={handleAdd}>Adicionar</button>
        </div>

        <div className="modal-actions" style={{ marginTop: '16px' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
