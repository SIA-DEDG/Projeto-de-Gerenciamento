'use client';

import { useState, useEffect } from 'react';
import { fetchUsers, deleteUser, updateUserRole, adminResetUserPassword } from '@/lib/api';
import { getUser, canResetPasswords, canManageUsers } from '@/lib/auth';
import type { UserPublic } from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';

const ROLES = [
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
  if (role === 'Gerente')     return { background: '#EEF3FA', color: 'var(--primary)' };
  if (role === 'Tecnico')     return { background: '#e0f2fe', color: '#0369a1' };
  if (role === 'Estagiario')  return { background: '#fdf4ff', color: '#a21caf' };
  return { background: '#f0fdf4', color: '#16a34a' };
}

// ── Modal de redefinição de senha ─────────────────────────────────────────────
function ResetPasswordModal({
  user,
  onClose,
  onSuccess,
}: {
  user: UserPublic;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm]         = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPassword !== confirm) { setError('As senhas não coincidem.'); return; }
    setSaving(true);
    try {
      await adminResetUserPassword(user.id, newPassword);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #eef0f2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#172b4d' }}>Redefinir senha</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#6b778c' }}>{user.name} ({user.username})</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b778c', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {error && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: '#ffebe6', borderRadius: 6, color: '#bf2600', fontSize: '0.85rem', border: '1px solid #ffbdad' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: '#344563' }}>
              Nova senha
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #dfe1e6', fontSize: '0.9rem', fontFamily: 'inherit' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: '#344563' }}>
              Confirmar nova senha
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                required
                style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #dfe1e6', fontSize: '0.9rem', fontFamily: 'inherit' }}
              />
            </label>
          </div>

          <div style={{ marginTop: 8, padding: '10px 12px', background: '#fffbeb', borderRadius: 6, border: '1px solid #fde68a', fontSize: '0.78rem', color: '#92400e' }}>
            O usuário será obrigado a trocar a senha no próximo login.
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 18px', background: 'none', border: '1px solid #dfe1e6', borderRadius: 6, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', color: '#344563' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: '8px 20px', background: saving ? '#a5adba' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Salvando…' : 'Redefinir senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UsuariosPage() {
  const currentUser = getUser();
  const myId        = currentUser?.user_id ?? '';
  const myRole      = currentUser?.role ?? '';
  const iAmAdmin    = myRole === 'Admin';

  const [users, setUsers]               = useState<UserPublic[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [deleting, setDeleting]         = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [resetModal, setResetModal]     = useState<UserPublic | null>(null);
  const [successMsg, setSuccessMsg]     = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message?: string; confirmLabel?: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((error: unknown) => setError(error instanceof Error ? error.message : 'Erro ao carregar usuários'))
      .finally(() => setLoading(false));
  }, []);

  function handleRoleChange(user: UserPublic, newRole: string) {
    const label = ROLES.find((r) => r.value === newRole)?.label ?? newRole;
    setConfirmDialog({
      title: 'Alterar perfil',
      message: `Alterar o perfil de "${user.name}" para "${label}"?`,
      confirmLabel: 'Alterar',
      onConfirm: async () => {
        setRoleUpdating(user.id);
        try {
          await updateUserRole(user.id, newRole);
          setUsers((currentUsers) => currentUsers.map((existingUser) => existingUser.id === user.id ? { ...existingUser, role: newRole } : existingUser));
        } catch (error: unknown) {
          setError(error instanceof Error ? error.message : 'Erro ao atualizar perfil');
        } finally {
          setRoleUpdating(null);
        }
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
          setUsers((currentUsers) => currentUsers.filter((existingUser) => existingUser.id !== user.id));
        } catch (error: unknown) {
          setError(error instanceof Error ? error.message : 'Erro ao excluir usuário');
        } finally {
          setDeleting(null);
        }
      },
    });
  }

  function handleResetSuccess() {
    setResetModal(null);
    setSuccessMsg(`Senha redefinida com sucesso. O usuário deverá trocar a senha no próximo login.`);
    setTimeout(() => setSuccessMsg(''), 5000);
  }

  const filtered = users.filter((user) => {
    if (!search) return true;
    const searchQuery = search.toLowerCase();
    return user.name.toLowerCase().includes(searchQuery) || user.username.toLowerCase().includes(searchQuery);
  });

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <h1>Gerenciar Usuários</h1>
        </div>
        <div className="topbar-right">
          <div className="topbar-search">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        {successMsg && (
          <div style={{ marginBottom: 20, padding: '12px 16px', background: '#e3fcef', borderRadius: 8, color: '#006644', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #abf5d1' }}>
            <span>{successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#006644', fontWeight: 700, fontSize: '1.1rem' }}>×</button>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 20, padding: '12px 16px', background: '#ffebe6', borderRadius: 8, color: '#bf2600', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #ffbdad' }}>
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bf2600', fontWeight: 700, fontSize: '1.1rem' }}>×</button>
          </div>
        )}

        {!loading && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total',        count: users.length,                                          color: 'var(--primary)', bg: 'var(--primary-light)' },
              { label: 'Admins',       count: users.filter((user) => user.role === 'Admin').length,  color: '#ef4123',        bg: '#FFF0ED' },
              { label: 'Gerentes',     count: users.filter((user) => user.role === 'Gerente').length,color: 'var(--primary)', bg: '#EEF3FA' },
              { label: 'Funcionários', count: users.filter((user) => user.role === 'Funcionario').length, color: '#16a34a', bg: '#f0fdf4' },
            ].map((stat) => (
              <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.color}22`, borderRadius: 10, padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: stat.color }}>{stat.count}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: stat.color, opacity: 0.8 }}>{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Carregando usuários…</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={thSt}>Colaborador</th>
                  <th style={thSt}>Usuário</th>
                  <th style={thSt}>Perfil</th>
                  <th style={thSt}>Cadastro</th>
                  <th style={{ ...thSt, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                      {search ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum usuário cadastrado.'}
                    </td>
                  </tr>
                )}
                {filtered.map((user, idx) => {
                  const isSelf       = user.id === myId;
                  const targetIsAdmin = user.role === 'Admin';
                  // Não-admins não podem alterar contas Admin
                  const canAct       = iAmAdmin || !targetIsAdmin;
                  return (
                    <tr key={user.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f0f1f3' : 'none' }}>
                      <td style={tdSt}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--primary), #023a7a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                            {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
                            {isSelf && <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700, background: 'var(--primary-light)', borderRadius: 10, padding: '1px 7px', width: 'fit-content' }}>Você</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdSt, color: 'var(--text-secondary)' }}>{user.username}</td>
                      <td style={tdSt}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, ...roleBadgeStyle(user.role) }}>
                            {ROLES.find((roleOption) => roleOption.value === user.role)?.label ?? user.role}
                          </span>
                          {canAct && !isSelf && (
                            <>
                              <select
                                value={user.role}
                                disabled={roleUpdating === user.id}
                                onChange={(e) => handleRoleChange(user, e.target.value)}
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-light)', fontSize: '0.78rem', fontFamily: 'inherit', cursor: roleUpdating === user.id ? 'not-allowed' : 'pointer', background: '#fff', color: 'var(--text-secondary)' }}
                                title="Alterar perfil"
                              >
                                {ROLES.map((roleOption) => <option key={roleOption.value} value={roleOption.value}>{roleOption.label}</option>)}
                              </select>
                              {roleUpdating === user.id && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Salvando…</span>}
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ ...tdSt, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td style={{ ...tdSt, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Redefinir senha — apenas Admin, exceto em si mesmo */}
                          {canResetPasswords(myRole) && !isSelf && canAct && (
                            <button
                              type="button"
                              onClick={() => setResetModal(user)}
                              style={{ padding: '6px 12px', background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 6, color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                              title="Redefinir senha"
                            >
                              Redefinir senha
                            </button>
                          )}

                          {/* Excluir */}
                          {isSelf || !canAct ? (
                            <span
                              title={isSelf ? 'Você não pode excluir sua própria conta' : 'Sem permissão para excluir este usuário'}
                              style={{ padding: '6px 14px', background: '#f4f5f7', border: '1px solid #dfe1e6', borderRadius: 6, color: '#a5adba', fontSize: '0.78rem', fontWeight: 600, cursor: 'not-allowed', display: 'inline-block' }}
                            >
                              Excluir
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
                              disabled={deleting === user.id}
                              style={{ padding: '6px 14px', background: deleting === user.id ? '#f0f1f3' : '#ffebe6', border: '1px solid #ffbdad', borderRadius: 6, color: deleting === user.id ? '#6b778c' : '#de350b', fontSize: '0.78rem', fontWeight: 600, cursor: deleting === user.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', minWidth: 72 }}
                            >
                              {deleting === user.id ? 'Excluindo…' : 'Excluir'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resetModal && (
        <ResetPasswordModal
          user={resetModal}
          onClose={() => setResetModal(null)}
          onSuccess={handleResetSuccess}
        />
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

const tdSt: React.CSSProperties = {
  padding: '13px 16px', verticalAlign: 'middle',
};
