'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { getTeamMembers, saveTeamMembers } from '@/lib/localStorage';
import { avatarColor, initials } from '@/lib/utils';
import type { TeamMember } from '@/types';
import ToastContainer from '@/components/ToastContainer';
import { useToast } from '@/hooks/useToast';

export default function EquipePage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const { toasts, addToast, dismissToast } = useToast();

  useEffect(() => { setMembers(getTeamMembers()); }, []);

  function handleAdd() {
    const n = name.trim();
    if (!n) return;
    const updated = [...members, { name: n, role: role.trim() }];
    saveTeamMembers(updated);
    setMembers(updated);
    setName(''); setRole('');
    addToast('success', 'Membro adicionado', `${n} adicionado à equipe.`);
  }

  function handleRemove(memberName: string) {
    const updated = members.filter((m) => m.name !== memberName);
    saveTeamMembers(updated);
    setMembers(updated);
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><h1 style={{ fontSize: '1rem', fontWeight: 700 }}>Equipe</h1></div>
      </div>

      <div style={{ padding: '20px 32px 40px', maxWidth: 640 }}>
        <div className="page-eyebrow">Gestão</div>
        <div className="page-title" style={{ fontSize: '1.3rem' }}>Membros da Equipe</div>
        <div className="page-title-rule" style={{ marginBottom: 24 }} />

        {/* Lista de membros */}
        <div className="manage-list" style={{ maxHeight: 'none', marginBottom: 20 }}>
          {members.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}><p>Nenhum membro cadastrado.</p></div>
          ) : members.map((m) => (
            <div key={m.name} className="manage-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="task-avatar" style={{ background: avatarColor(m.name), width: 30, height: 30, fontSize: '0.7rem' }}>{initials(m.name)}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{m.name}</div>
                  {m.role && <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.role}</div>}
                </div>
              </div>
              <button className="btn btn-danger btn-xs" onClick={() => handleRemove(m.name)}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>

        {/* Adicionar membro */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-1)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 12 }}>Adicionar membro</div>
          <div className="form-row" style={{ marginBottom: 10 }}>
            <div className="form-field">
              <label className="form-label">Nome</label>
              <input className="form-input" type="text" value={name} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="Nome completo" />
            </div>
            <div className="form-field">
              <label className="form-label">Cargo</label>
              <input className="form-input" type="text" value={role} onChange={(e) => setRole(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                placeholder="Ex: Técnico(a)" />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!name.trim()}>
            <Plus size={13} />Adicionar
          </button>
        </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
