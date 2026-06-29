﻿'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchUsers, deleteUser, updateUserRole, adminResetUserPassword } from '@/lib/api';
import { getUser, canResetPasswords } from '@/lib/auth';
import type { UserPublic } from '@/lib/api';
import ConfirmModal from '@/components/ConfirmModal';
import { Search, ChevronDown, Lock, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

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

const AVATAR_COLORS = ['var(--blue)','#15803d','#9333ea','#b91c1c','#0369a1','#be185d','#b45309','#0f766e'];
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

  const inp: React.CSSProperties = { width: '100%', padding: '10px 13px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.88rem', fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: '0.66rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', display: 'block', marginBottom: 6 };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,45,0.32)', zIndex: 400 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '94%', background: 'var(--surface)', borderLeft: '1px solid var(--line-1)', zIndex: 401, display: 'flex', flexDirection: 'column', animation: 'drawin .24s cubic-bezier(.4,0,.2,1) both' }}>

        {/* Stripe */}
        <div style={{ height: 4, flexShrink: 0, background: 'linear-gradient(90deg,var(--blue) 0 40%,#E0A92E 40% 55%,#b42318 55% 75%,#1B8A4B 75%)' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--line-1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: 'var(--blue)', flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-2)' }}>Redefinir senha</span>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Info do usuário */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 3, border: '1px solid var(--line-1)' }}>
            <div className="mono" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.66rem', fontWeight: 700, flexShrink: 0 }}>
              {user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)' }}>{user.name}</div>
              <div className="mono" style={{ fontSize: '0.64rem', color: 'var(--text-3)', marginTop: 2 }}>@{user.username}</div>
            </div>
          </div>

          <div>
            <label style={lbl}>Nova senha</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required style={inp}
              onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
          </div>

          <div>
            <label style={lbl}>Confirmar nova senha</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a nova senha" required style={inp}
              onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
          </div>

          {error && <p style={{ color: '#b42318', fontSize: '0.82rem', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '11px 14px', border: '1px solid #E0A92E40', borderRadius: 3, background: '#FFFBEB' }}>
            <Lock size={14} style={{ color: '#A87A00', flexShrink: 0, marginTop: 1 }} />
            <span className="mono" style={{ fontSize: '0.68rem', color: '#A87A00', lineHeight: 1.5 }}>
              O usuário será obrigado a <strong>trocar a senha</strong> no próximo login.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: 12, border: 'none', borderRadius: 3, background: saving ? 'var(--text-3)' : 'var(--blue)', color: '#fff', fontSize: '0.84rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--blue-h)'; }}
              onMouseLeave={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = 'var(--blue)'; }}>
              {saving ? 'Salvando…' : 'Redefinir senha'}
            </button>
            <button type="button" onClick={onClose}
              style={{ padding: '12px 18px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.84rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function UsuariosPage() {
  const currentUser = getUser();
  const myId     = currentUser?.user_id ?? '';
  const myRole   = currentUser?.role ?? '';
  const iAmAdmin = myRole === 'Admin'; // Super-Admin — vê todos os usuários de todas as diretorias

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

  // Agrupamento por diretoria — só para admin e sem busca ativa
  const dirGroups = useMemo(() => {
    if (!iAmAdmin || search) return null;
    const map = new Map<string, { name: string; color: string | null; users: UserPublic[] }>();
    for (const u of filtered) {
      const key = u.directoria_id ?? '__sem_diretoria__';
      if (!map.has(key)) map.set(key, { name: u.directoria_name ?? 'Sem diretoria', color: u.directoria_color ?? null, users: [] });
      map.get(key)!.users.push(u);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.name === 'Sem diretoria') return 1;
      if (b.name === 'Sem diretoria') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [iAmAdmin, search, filtered]);

  return (
    <>
      <PageHeader
        eyebrow="Controle de acesso · Admin"
        title="Gerenciar usuários"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', background: 'var(--surface)' }}>
            <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <input type="text" placeholder="Buscar usuário..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'none', fontSize: '0.82rem', color: 'var(--text)', width: 180, fontFamily: 'inherit' }} />
          </div>
        }
      />

      {/* Mensagens de sucesso/erro */}
      {(successMsg || error) && (
        <div style={{ padding: '0 32px', marginTop: 12 }}>
          {successMsg && (
            <div style={{ padding: '10px 14px', background: '#e3fcef', borderRadius: 3, color: '#006644', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', border: '1px solid #abf5d1', marginBottom: 8 }}>
              <span>{successMsg}</span>
              <button type="button" onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#006644', fontWeight: 700 }}>×</button>
            </div>
          )}
          {error && (
            <div style={{ padding: '10px 14px', background: '#ffebe6', borderRadius: 3, color: '#bf2600', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', border: '1px solid #ffbdad' }}>
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bf2600', fontWeight: 700 }}>×</button>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--line-1)', marginTop: 24 }}>
        {loading ? (
          <div className="loading-state">Carregando usuários…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>{search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}</p></div>
        ) : (
          <div>
            {/* Cabeçalho */}
            <div style={{ display: 'grid', gridTemplateColumns: iAmAdmin && !dirGroups ? '1fr 140px 180px 110px 72px' : iAmAdmin && dirGroups ? '1fr 180px 110px 72px' : '1fr 180px 110px 72px', padding: '11px 32px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line-1)', position: 'sticky', top: 0, zIndex: 1 }}>
              {(iAmAdmin && !dirGroups ? ['Colaborador', 'Diretoria', 'Perfil', 'Cadastro', ''] : ['Colaborador', 'Perfil', 'Cadastro', '']).map((h, i) => (
                <span key={i} className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</span>
              ))}
            </div>

            {/* Lista flat — não-admin OU admin com busca ativa */}
            {(!iAmAdmin || !dirGroups) && filtered.map((user) => {
              const isSelf        = user.id === myId;
              const targetIsAdmin = user.role === 'Admin';
              const canAct        = iAmAdmin || !targetIsAdmin;
              const canReset      = canResetPasswords(myRole) && !isSelf && canAct;
              const roles         = allowedRoles(user);
              const color         = avatarColor(user.name);
              const inits         = user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
              const { color: roleColor, background: roleBg } = roleBadgeStyle(user.role);
              const roleLabel = ALL_ROLES.find(r => r.value === user.role)?.label ?? user.role;

              return (
                <div key={user.id}
                  style={{ display: 'grid', gridTemplateColumns: (iAmAdmin && !dirGroups) ? '1fr 140px 180px 110px 72px' : '1fr 180px 110px 72px', padding: '14px 32px', alignItems: 'center', borderBottom: '1px solid var(--line-2)', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>

                  {/* Colaborador */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div className="mono" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.5px' }}>{inits}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {user.name}
                        {isSelf && (
                          <span className="mono" style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--blue)', background: 'var(--primary-light)', borderRadius: 3, padding: '1px 6px', textTransform: 'uppercase' }}>Você</span>
                        )}
                      </div>
                      <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 2, letterSpacing: '0.3px' }}>@{user.username}</div>
                    </div>
                  </div>

                  {/* Diretoria — só para Admin em busca (flat list) */}
                  {(iAmAdmin && !dirGroups) && (
                    <div style={{ minWidth: 0 }}>
                      {user.directoria_name ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-2)' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: user.directoria_color ?? '#6b7280', flexShrink: 0 }} />
                          {user.directoria_name}
                        </span>
                      ) : (
                        <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>—</span>
                      )}
                    </div>
                  )}

                  {/* Perfil — select estilizado quando editável, chip quando não */}
                  {canAct && !isSelf ? (
                    <div style={{ position: 'relative', width: 'fit-content' }}>
                      <select
                        value={user.role}
                        disabled={roleUpdating === user.id}
                        onChange={e => handleRoleChange(user, e.target.value)}
                        style={{
                          appearance: 'none',
                          padding: '5px 26px 5px 10px',
                          borderRadius: 4,
                          border: `1.5px solid ${roleColor}40`,
                          background: roleBg,
                          color: roleColor,
                          fontSize: '0.72rem',
                          fontFamily: 'var(--mono)',
                          fontWeight: 700,
                          letterSpacing: '0.4px',
                          textTransform: 'uppercase',
                          cursor: roleUpdating === user.id ? 'wait' : 'pointer',
                          outline: 'none',
                          opacity: roleUpdating === user.id ? 0.6 : 1,
                          transition: 'opacity 0.15s',
                        }}
                      >
                        {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <ChevronDown size={11} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: roleColor, opacity: 0.7 }} />
                    </div>
                  ) : (
                    <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: roleColor, background: roleBg, padding: '5px 10px', borderRadius: 4, width: 'fit-content' }}>
                      {roleLabel}
                    </span>
                  )}

                  {/* Cadastro */}
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.3px' }}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                  </span>

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                    {canReset && (
                      <button type="button" title="Redefinir senha" onClick={() => setResetModal(user)}
                        style={{ width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s', flexShrink: 0 }}
                        onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = 'var(--blue)'; b.style.color = 'var(--blue)'; b.style.background = 'var(--primary-light)'; }}
                        onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text-3)'; b.style.background = 'var(--surface)'; }}>
                        <Lock size={13} />
                      </button>
                    )}
                    {canAct && !isSelf && (
                      <button type="button" title="Excluir usuário" onClick={() => handleDelete(user)} disabled={deleting === user.id}
                        style={{ width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-3)', cursor: deleting === user.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s', opacity: deleting === user.id ? 0.4 : 1, flexShrink: 0 }}
                        onMouseEnter={e => { if (deleting !== user.id) { const b = e.currentTarget; b.style.borderColor = '#b42318'; b.style.color = '#b42318'; b.style.background = 'rgba(180,35,24,0.06)'; } }}
                        onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text-3)'; b.style.background = 'var(--surface)'; }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Admin sem busca — agrupado por diretoria */}
            {iAmAdmin && dirGroups && dirGroups.map(group => (
              <div key={group.name}>
                {/* Cabeçalho do grupo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 32px', background: 'var(--surface-2)', borderTop: '1px solid var(--line-1)', borderBottom: '1px solid var(--line-1)' }}>
                  {group.color
                    ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
                    : <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-3)', flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)' }}>{group.name}</span>
                  <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginLeft: 4 }}>
                    {group.users.length} membro{group.users.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {group.users.map((user) => {
                  const isSelf        = user.id === myId;
                  const targetIsAdmin = user.role === 'Admin';
                  const canAct        = !targetIsAdmin;
                  const canReset      = canResetPasswords(myRole) && !isSelf && canAct;
                  const roles         = allowedRoles(user);
                  const color         = avatarColor(user.name);
                  const inits         = user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                  const { color: roleColor, background: roleBg } = roleBadgeStyle(user.role);
                  const roleLabel     = ALL_ROLES.find(r => r.value === user.role)?.label ?? user.role;
                  return (
                    <div key={user.id}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 180px 110px 72px', padding: '14px 32px', alignItems: 'center', borderBottom: '1px solid var(--line-2)', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>

                      {/* Colaborador */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div className="mono" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.5px' }}>{inits}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {user.name}
                            {isSelf && <span className="mono" style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--blue)', background: 'var(--primary-light)', borderRadius: 3, padding: '1px 6px', textTransform: 'uppercase' }}>Você</span>}
                          </div>
                          <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 2, letterSpacing: '0.3px' }}>@{user.username}</div>
                        </div>
                      </div>

                      {/* Perfil */}
                      {canAct && !isSelf ? (
                        <div style={{ position: 'relative', width: 'fit-content' }}>
                          <select value={user.role} disabled={roleUpdating === user.id} onChange={e => handleRoleChange(user, e.target.value)}
                            style={{ appearance: 'none', padding: '5px 26px 5px 10px', borderRadius: 4, border: `1.5px solid ${roleColor}40`, background: roleBg, color: roleColor, fontSize: '0.72rem', fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', cursor: roleUpdating === user.id ? 'wait' : 'pointer', outline: 'none', opacity: roleUpdating === user.id ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                            {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          <ChevronDown size={11} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: roleColor, opacity: 0.7 }} />
                        </div>
                      ) : (
                        <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: roleColor, background: roleBg, padding: '5px 10px', borderRadius: 4, width: 'fit-content' }}>
                          {roleLabel}
                        </span>
                      )}

                      {/* Cadastro */}
                      <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.3px' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                      </span>

                      {/* Ações */}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {canReset && (
                          <button type="button" title="Redefinir senha" onClick={() => setResetModal(user)}
                            style={{ width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s', flexShrink: 0 }}
                            onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = 'var(--blue)'; b.style.color = 'var(--blue)'; b.style.background = 'var(--primary-light)'; }}
                            onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text-3)'; b.style.background = 'var(--surface)'; }}>
                            <Lock size={13} />
                          </button>
                        )}
                        {canAct && !isSelf && (
                          <button type="button" title="Excluir usuário" onClick={() => handleDelete(user)} disabled={deleting === user.id}
                            style={{ width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-3)', cursor: deleting === user.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s', opacity: deleting === user.id ? 0.4 : 1, flexShrink: 0 }}
                            onMouseEnter={e => { if (deleting !== user.id) { const b = e.currentTarget; b.style.borderColor = '#b42318'; b.style.color = '#b42318'; b.style.background = 'rgba(180,35,24,0.06)'; } }}
                            onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text-3)'; b.style.background = 'var(--surface)'; }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {false && ( // keep old table structure for TS compliance
              <table style={{ display: 'none' }}>
                <thead><tr><th></th></tr></thead>
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
