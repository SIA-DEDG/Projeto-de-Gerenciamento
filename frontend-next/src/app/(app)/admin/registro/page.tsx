'use client';

import { useState, useEffect } from 'react';
import { registerUser, deleteUser, fetchUsers } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import ConfirmModal from '@/components/ConfirmModal';
import { GraduationCap, User, Wrench, ClipboardList, BarChart2, Landmark, ShieldAlert, Check, Copy, Trash2, RefreshCw, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ROLES: { value: string; label: string; desc: string; color: string; bg: string; Icon: LucideIcon }[] = [
  { value: 'Estagiario',  label: 'Estagiário(a)',   desc: 'Tarefas atribuídas',      color: '#a21caf', bg: '#fdf4ff', Icon: GraduationCap },
  { value: 'Funcionario', label: 'Funcionário(a)',   desc: 'Acesso padrão',           color: '#16a34a', bg: '#f0fdf4', Icon: User },
  { value: 'Tecnico',     label: 'Técnico(a)',       desc: 'Projetos e atividades',   color: '#0369a1', bg: '#e0f2fe', Icon: Wrench },
  { value: 'Coordenador', label: 'Coordenador(a)',   desc: 'Coordena equipes',        color: '#b45309', bg: '#fef9c3', Icon: ClipboardList },
  { value: 'Gerente',     label: 'Gerente',          desc: 'Atividades e relatórios', color: '#1d4ed8', bg: '#dbeafe', Icon: BarChart2 },
  { value: 'Diretor',     label: 'Diretor(a)',       desc: 'Visão estratégica',       color: '#7c3aed', bg: '#f3e8ff', Icon: Landmark },
  { value: 'Admin',       label: 'Administrador(a)', desc: 'Acesso total ao sistema', color: '#ef4123', bg: '#FFF0ED', Icon: ShieldAlert },
];

interface PasswordEntry {
  user_id: string; name: string; username: string;
  role: string; temp_password: string; created_at: string;
}

function loadHistory(): PasswordEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('sia_password_history') ?? '[]'); } catch { return []; }
}
function saveHistory(e: PasswordEntry[]) { localStorage.setItem('sia_password_history', JSON.stringify(e)); }

function toUsername(name: string) {
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/\s+/).filter(Boolean).join('.');
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 13px', border: '1.5px solid var(--border-light)',
  borderRadius: 3, fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box', background: '#fff',
};

export default function RegistroPage() {
  const { toasts, addToast, dismissToast } = useToast();
  const currentUser = getUser();
  const iAmAdmin = currentUser?.role === 'Admin';

  const availableRoles = ROLES.filter(r => r.value === 'Admin' ? iAmAdmin : true);

  const [fullName, setFullName]   = useState('');
  const [username, setUsername]   = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [role, setRole]           = useState('Estagiario');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const [history, setHistory]     = useState<PasswordEntry[]>([]);
  const [copied, setCopied]       = useState<string | null>(null);
  const [success, setSuccess]     = useState<PasswordEntry | null>(null);
  const [removing, setRemoving]   = useState<string | null>(null);
  const [removeErr, setRemoveErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PasswordEntry | null>(null);

  useEffect(() => {
    if (!usernameTouched && fullName) setUsername(toUsername(fullName));
    if (!fullName) { setUsername(''); setUsernameTouched(false); }
  }, [fullName, usernameTouched]);

  useEffect(() => {
    const stored = loadHistory();
    if (stored.length === 0) { setHistory([]); return; }
    fetchUsers().then(users => {
      const pending = stored.filter(e => users.find(u => u.id === e.user_id)?.must_change_password === true);
      if (pending.length !== stored.length) saveHistory(pending);
      setHistory(pending);
    }).catch(() => setHistory(stored));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !username.trim()) { setError('Preencha nome e usuário.'); return; }
    setLoading(true);
    try {
      const data = await registerUser({ name: fullName.trim(), username: username.trim(), role });
      const entry: PasswordEntry = {
        user_id: data.user_id, name: fullName.trim(), username: username.trim(),
        role: data.role, temp_password: data.temp_password, created_at: new Date().toISOString(),
      };
      const updated = [entry, ...loadHistory()]; saveHistory(updated); setHistory(updated);
      setSuccess(entry);
      setFullName(''); setUsername(''); setUsernameTouched(false); setRole('Estagiario');
      addToast('success', 'Usuário criado', `${entry.name} foi cadastrado.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário.');
    } finally { setLoading(false); }
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  }

  async function doRemove(entry: PasswordEntry) {
    setRemoving(entry.user_id); setRemoveErr(null);
    try {
      await deleteUser(entry.user_id);
      const updated = history.filter(h => h.user_id !== entry.user_id);
      saveHistory(updated); setHistory(updated);
      if (success?.user_id === entry.user_id) setSuccess(null);
    } catch (err: unknown) {
      setRemoveErr(err instanceof Error ? err.message : 'Erro ao excluir usuário.');
    } finally { setRemoving(null); }
  }

  const selectedRole = availableRoles.find(r => r.value === role) ?? availableRoles[0]!;

  return (
    <>
      <div style={{ padding: '26px 32px 16px', flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--line-1)' }}>
        <div className="mono" style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-3)', letterSpacing: '1.4px', textTransform: 'uppercase' }}>Controle de acesso · Admin</div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 600, letterSpacing: '-0.7px', color: 'var(--text)', marginTop: 6 }}>Cadastrar usuário</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', gap: 28, alignItems: 'flex-start' }}>

        {/* ── Left: Form ── */}
        <div style={{ flex: '0 0 480px', maxWidth: 480 }}>

          {/* Success banner */}
          {success && (
            <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1.5px solid #86efac', borderRadius: 3, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 3, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} color="#fff" strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#166534' }}>Colaborador criado!</span>
                <button onClick={() => setSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#15803d', marginBottom: 10 }}>
                Repasse a senha temporária para <strong>{success.name}</strong>:
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ flex: 1, background: 'rgba(255,255,255,0.7)', borderRadius: 3, padding: '9px 14px', fontSize: '1rem', fontWeight: 700, color: '#14532d', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                  {success.temp_password}
                </code>
                <button type="button" onClick={() => handleCopy(success.temp_password, 'success')}
                  style={{ padding: '9px 16px', background: copied === 'success' ? '#166534' : '#16a34a', color: '#fff', border: 'none', borderRadius: 3, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {copied === 'success' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}

          {/* Form card */}
          <div style={{ background: '#fff', borderRadius: 3, border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(3,78,162,0.06)' }}>
            <div style={{ height: 4, background: 'var(--primary)' }} />

            <form onSubmit={handleSubmit} noValidate style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Nome */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Nome completo</label>
                <input type="text" placeholder="Ex: João Silva" value={fullName} onChange={e => setFullName(e.target.value)} autoFocus style={inp}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-light)'; e.target.style.boxShadow = 'none'; }} />
              </div>

              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Nome de usuário
                  {!usernameTouched && fullName && <span style={{ marginLeft: 6, fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600, background: 'var(--primary-light)', borderRadius: 3, padding: '1px 5px' }}>auto</span>}
                </label>
                <input type="text" placeholder="joao.silva" value={username}
                  onChange={e => { setUsername(e.target.value); setUsernameTouched(true); }}
                  style={inp}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-light)'; e.target.style.boxShadow = 'none'; }} />
              </div>

              {/* Role grid */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Perfil de acesso</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {availableRoles.map(r => {
                    const active = role === r.value;
                    return (
                      <button key={r.value} type="button" onClick={() => setRole(r.value)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', borderRadius: 3, border: `1.5px solid ${active ? r.color : 'var(--border-light)'}`, background: active ? r.bg : '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s', boxShadow: active ? `0 0 0 2px ${r.color}22` : 'none' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 3, background: active ? r.color + '22' : 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <r.Icon size={14} color={active ? r.color : 'var(--text-muted)'} strokeWidth={2} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: active ? r.color : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</div>
                          <div style={{ fontSize: '0.7rem', color: active ? r.color : 'var(--text-muted)', marginTop: 1, opacity: active ? 0.8 : 1 }}>{r.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div style={{ color: '#bf2600', background: '#ffebe6', padding: '10px 13px', borderRadius: 3, fontSize: '0.83rem', border: '1px solid #ffbdad' }}>{error}</div>
              )}

              <button type="submit" disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', fontSize: '0.9rem', fontWeight: 700, background: loading ? 'var(--text-muted)' : selectedRole.color, color: '#fff', border: 'none', borderRadius: 3, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}>
                {loading ? (
                  <><RefreshCw size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Criando…</>
                ) : (
                  <><selectedRole.Icon size={16} strokeWidth={2} /> Criar como {selectedRole.label}</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right: Password History ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: '#fff', borderRadius: 3, border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(3,78,162,0.06)' }}>
            <div style={{ height: 4, background: '#eab308' }} />
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 3, background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={15} color="#b45309" strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Senhas temporárias pendentes</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 1 }}>Colaboradores que ainda não fizeram o primeiro acesso</div>
              </div>
              <span style={{ background: history.length > 0 ? '#fef9c3' : 'var(--bg-app)', color: history.length > 0 ? '#b45309' : 'var(--text-muted)', borderRadius: 3, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                {history.length} pendente{history.length !== 1 ? 's' : ''}
              </span>
            </div>

            {removeErr && (
              <div style={{ margin: '12px 20px 0', padding: '10px 13px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 3, color: '#b91c1c', fontSize: '0.83rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{removeErr}</span>
                <button onClick={() => setRemoveErr(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: 700 }}>×</button>
              </div>
            )}

            {history.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: 3, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={24} color="#22c55e" strokeWidth={1.5} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0, fontWeight: 500 }}>Nenhuma senha temporária pendente.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>Todos os colaboradores já definiram suas senhas.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {history.map((entry, idx) => {
                  const roleInfo = ROLES.find(r => r.value === entry.role);
                  const avatarColors = ['#034ea2','#15803d','#9333ea','#b91c1c','#0369a1'];
                  let h = 0; for (const c of entry.name) h = (h * 31 + c.charCodeAt(0)) | 0;
                  const aColor = avatarColors[Math.abs(h) % avatarColors.length];
                  const initials = entry.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <div key={entry.user_id}
                      style={{ padding: '14px 20px', borderBottom: idx < history.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: aColor + '18', color: aColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{entry.name}</div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>@{entry.username}</div>
                        </div>
                        {roleInfo && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 3, background: roleInfo.bg, color: roleInfo.color, whiteSpace: 'nowrap' }}>
                            <roleInfo.Icon size={10} strokeWidth={2.5} />
                            {roleInfo.label}
                          </span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <code style={{ flex: 1, background: 'var(--bg-app)', borderRadius: 3, padding: '8px 12px', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.06em', fontFamily: 'monospace', border: '1px solid var(--border-light)' }}>
                          {entry.temp_password}
                        </code>
                        <button type="button" onClick={() => handleCopy(entry.temp_password, entry.user_id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', background: copied === entry.user_id ? '#16a34a' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: 3, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.15s' }}>
                          {copied === entry.user_id
                            ? <><Check size={11} strokeWidth={2.5} /> Copiado</>
                            : <><Copy size={11} strokeWidth={2} /> Copiar</>
                          }
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(entry)} disabled={removing === entry.user_id}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 11px', background: '#fff5f5', border: 'none', borderRadius: 3, color: '#dc2626', fontSize: '0.78rem', fontWeight: 600, cursor: removing === entry.user_id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0, transition: 'background 0.15s', opacity: removing === entry.user_id ? 0.6 : 1 }}
                          onMouseEnter={e => { if (removing !== entry.user_id) e.currentTarget.style.background = '#fee2e2'; }}
                          onMouseLeave={e => (e.currentTarget.style.background = '#fff5f5')}>
                          <Trash2 size={11} strokeWidth={2} />
                          {removing === entry.user_id ? '…' : 'Excluir'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title={`Excluir conta de "${confirmDelete?.name}"`}
        message={`O usuário @${confirmDelete?.username} será removido permanentemente do sistema. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir conta"
        danger
        onConfirm={() => { if (confirmDelete) doRemove(confirmDelete); setConfirmDelete(null); }}
        onClose={() => setConfirmDelete(null)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
