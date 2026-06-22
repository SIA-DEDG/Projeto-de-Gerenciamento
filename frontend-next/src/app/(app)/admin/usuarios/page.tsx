'use client';

import { useState, useEffect } from 'react';
import { fetchUsers, deleteUser, updateUserRole, adminResetUserPassword } from '@/lib/api';
import { getUser, canResetPasswords } from '@/lib/auth';
import type { UserPublic } from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';
import { Search, ChevronDown, Lock, Trash2 } from 'lucide-react';

const ALL_ROLES = [
  { value: 'Estagiario',  label: 'Estagiário(a)'   },
  { value: 'Funcionario', label: 'Funcionário(a)'   },
  { value: 'Tecnico',     label: 'Técnico(a)'       },
  { value: 'Coordenador', label: 'Coordenador(a)'   },
  { value: 'Gerente',     label: 'Gerente'           },
  { value: 'Diretor',     label: 'Diretor(a)'       },
  { value: 'Admin',       label: 'Administrador(a)' },
];

function roleBadgeStyle(role: string): React.CSSProperties {
  if (role === 'Admin')       return { background: '#FFF0ED', color: '#ef4123' };
  if (role === 'Diretor')     return { background: '#f3e8ff', color: '#7c3aed' };
  if (role === 'Coordenador') return { background: '#fef3c7', color: '#b45309' };
  if (role === 'Gerente')     return { background: '#dbeafe', color: '#1d4ed8' };
  if (role === 'Tecnico')     return { background: '#e0f2fe', color: '#0369a1' };
  if (role === 'Estagiario')  return { background: '#fdf4ff', color: '#a21caf' };
  return { background: '#f0fdf4', color: '#16a34a' };
}

const AVATAR_COLORS = ['#034ea2','#15803d','#9333ea','#b91c1c','#0369a1','#be185d','#b45309','#0f766e'];
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function ResetPasswordModal({ user, onClose, onSuccess }: { user: UserPublic; onClose: () => void; onSuccess: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPassword !== confirm) { setError('As senhas não coincidem.'); return; }
    setSaving(true);
    try { await adminResetUserPassword(user.id, newPassword); onSuccess(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Erro ao redefinir senha'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 3, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Redefinir senha</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b778c' }}>{user.name} ({user.username})</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b778c', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {error && <div style={{ marginBottom: 14, padding: '10px 14px', background: '#ffebe6', borderRadius: 3, color: '#bf2600', fontSize: '0.85rem' }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', fontWeight: 600 }}>
              Nova senha
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required style={{ padding: '9px 12px', borderRadius: 3, border: '1px solid #dfe1e6', fontSize: '0.9rem', fontFamily: 'inherit' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', fontWeight: 600 }}>
              Confirmar nova senha
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a nova senha" required style={{ padding: '9px 12px', borderRadius: 3, border: '1px solid #dfe1e6', fontSize: '0.9rem', fontFamily: 'inherit' }} />
            </label>
          </div>
          <div style={{ marginTop: 8, padding: '10px 12px', background: '#fffbeb', borderRadius: 3, border: '1px solid #fde68a', fontSize: '0.78rem', color: '#92400e' }}>
            O usuário será obrigado a trocar a senha no próximo login.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 18px', background: 'none', border: '1px solid #dfe1e6', borderRadius: 3, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding: '8px 20px', background: saving ? '#a5adba' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: 3, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Salvando…' : 'Redefinir senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const currentUser = getUser();
  const myId    = currentUser?.user_id ?? '';
  const myRole  = currentUser?.role ?? '';
  const iAmAdmin = myRole === 'Admin';

  const [users, setUsers]         = useState<UserPublic[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [resetModal, setResetModal] = useState<UserPublic | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message?: string; confirmLabel?: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erro ao carregar usuários'))
      .finally(() => setLoading(false));
  }, []);

  function allowedRoles(targetUser: UserPublic) {
    return ALL_ROLES.filter(r => {
      if (r.value === 'Admin')   return iAmAdmin;
      if (r.value === 'Diretor') return iAmAdmin;
      return true;
    });
  }

  function handleRoleChange(user: UserPublic, newRole: string) {
    const label = ALL_ROLES.find((r) => r.value === newRole)?.label ?? newRole;
    setConfirmDialog({
      title: 'Alterar perfil',
      message: `Alterar o perfil de "${user.name}" para "${label}"?`,
      confirmLabel: 'Alterar',
      onConfirm: async () => {
        setRoleUpdating(user.id);
        try {
          await updateUserRole(user.id, newRole);
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : 'Erro ao atualizar perfil');
        } finally { setRoleUpdating(null); }
      },
    });
  }

  function handleDelete(user: UserPublic) {
    setConfirmDialog({
      title: 'Excluir usuário',
      message: `Excluir permanentemente "${user.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        setDeleting(user.id);
        setError('');
        try {
          await deleteUser(user.id);
          setUsers(prev => prev.filter(u => u.id !== user.id));
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : 'Erro ao excluir usuário');
        } finally { setDeleting(null); }
      },
    });
  }

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  return (
    <>
      <div style={{ padding: '26px 32px 16px', flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--line-1)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <div className="mono" style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-3)', letterSpacing: '1.4px', textTransform: 'uppercase' }}>Controle de acesso · Admin</div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 600, letterSpacing: '-0.7px', color: 'var(--text)', marginTop: 6 }}>Gerenciar usuários</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', background: 'var(--surface)', marginBottom: 4 }}>
            <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <input type="text" placeholder="Buscar usuário..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'none', fontSize: '0.82rem', color: 'var(--text)', width: 180, fontFamily: 'inherit' }} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
        {successMsg && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#e3fcef', borderRadius: 3, color: '#006644', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', border: '1px solid #abf5d1' }}>
            <span>{successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#006644', fontWeight: 700 }}>×</button>
          </div>
        )}
        {error && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#ffebe6', borderRadius: 3, color: '#bf2600', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', border: '1px solid #ffbdad' }}>
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bf2600', fontWeight: 700 }}>×</button>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Carregando usuários…</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: 3, border: '1px solid var(--border-light)', boxShadow: '0 2px 12px rgba(3,78,162,0.06)', overflow: 'hidden' }}>
            <div style={{ height: 3, background: 'var(--primary)' }} />
            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                {search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)' }}>
                    <th style={thSt}>Colaborador</th>
                    <th style={thSt}>Usuário</th>
                    <th style={thSt}>Perfil</th>
                    <th style={thSt}>Cadastro</th>
                    <th style={{ ...thSt, textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user, idx) => {
                    const isSelf = user.id === myId;
                    const targetIsAdmin = user.role === 'Admin';
                    const canAct = iAmAdmin || !targetIsAdmin;
                    const roles = allowedRoles(user);
                    const color = avatarColor(user.name);
                    const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <tr key={user.id}
                        style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-light)' : 'none', transition: 'background 0.12s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-app)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={tdSt}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800 }}>
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{user.name}</div>
                              {isSelf && <span style={{ fontSize: '0.62rem', color: 'var(--primary)', fontWeight: 700, background: 'var(--primary-light)', borderRadius: 3, padding: '1px 7px' }}>Você</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ ...tdSt, color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{user.username}</td>
                        <td style={tdSt}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 3, whiteSpace: 'nowrap', ...roleBadgeStyle(user.role) }}>
                              {ALL_ROLES.find(r => r.value === user.role)?.label ?? user.role}
                            </span>
                            {canAct && !isSelf && (
                              <div style={{ position: 'relative' }}>
                                <select value={user.role} disabled={roleUpdating === user.id}
                                  onChange={(e) => handleRoleChange(user, e.target.value)}
                                  style={{ appearance: 'none', padding: '4px 24px 4px 8px', borderRadius: 3, border: '1px solid var(--border-light)', fontSize: '0.75rem', fontFamily: 'inherit', cursor: 'pointer', background: '#fff', color: 'var(--text-secondary)', outline: 'none' }}>
                                  {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                                <ChevronDown size={10} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                                {roleUpdating === user.id && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 4 }}>…</span>}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ ...tdSt, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td style={{ ...tdSt, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            {canResetPasswords(myRole) && !isSelf && canAct && (
                              <button type="button" onClick={() => setResetModal(user)}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', background: 'var(--primary-light)', border: 'none', borderRadius: 3, color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-glow)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'var(--primary-light)')}>
                                <Lock size={12} />
                                Redefinir
                              </button>
                            )}
                            {isSelf || !canAct ? (
                              <span style={{ padding: '6px 11px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: 3, color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                                title={isSelf ? 'Você não pode excluir sua própria conta' : 'Sem permissão'}>
                                <Trash2 size={12} />
                                Excluir
                              </span>
                            ) : (
                              <button type="button" onClick={() => handleDelete(user)} disabled={deleting === user.id}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', background: '#fff5f5', border: 'none', borderRadius: 3, color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, cursor: deleting === user.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: deleting === user.id ? 0.6 : 1, transition: 'background 0.15s' }}
                                onMouseEnter={e => { if (deleting !== user.id) e.currentTarget.style.background = '#fee2e2'; }}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff5f5')}>
                                <Trash2 size={12} />
                                {deleting === user.id ? '…' : 'Excluir'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {resetModal && (
        <ResetPasswordModal user={resetModal} onClose={() => setResetModal(null)} onSuccess={() => { setResetModal(null); setSuccessMsg('Senha redefinida. O usuário deverá trocá-la no próximo login.'); setTimeout(() => setSuccessMsg(''), 5000); }} />
      )}
      <ConfirmModal
        open={!!confirmDialog}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel ?? 'Confirmar'}
        danger={confirmDialog?.confirmLabel === 'Excluir'}
        onConfirm={() => confirmDialog?.onConfirm()}
        onClose={() => setConfirmDialog(null)}
      />
    </>
  );
}

const thSt: React.CSSProperties = {
  padding: '11px 16px', fontWeight: 700, color: 'var(--text-secondary)',
  fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left',
};
const tdSt: React.CSSProperties = { padding: '13px 16px', verticalAlign: 'middle' };
