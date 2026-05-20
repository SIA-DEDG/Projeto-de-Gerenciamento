'use client';

import { useState, useEffect } from 'react';
import { registerUser, deleteUser, fetchUsers } from '@/lib/api';

const ROLES = [
  { value: 'Estagiario',   label: 'Estagiário(a)',    desc: 'Acesso limitado — tarefas atribuídas'        },
  { value: 'Funcionario',  label: 'Funcionário(a)',    desc: 'Acesso padrão ao sistema'                   },
  { value: 'Tecnico',      label: 'Técnico(a)',        desc: 'Acesso técnico a projetos e atividades'     },
  { value: 'Coordenador',  label: 'Coordenador(a)',    desc: 'Coordena equipes e acompanha resultados'    },
  { value: 'Gerente',      label: 'Gerente',           desc: 'Gerencia atividades e relatórios'           },
  { value: 'Diretor',      label: 'Diretor(a)',        desc: 'Visão estratégica e acesso gerencial amplo' },
  { value: 'Admin',        label: 'Administrador(a)',  desc: 'Acesso total ao sistema'                    },
];

interface PasswordEntry {
  user_id:      string;
  name:         string;
  username:     string;
  role:         string;
  temp_password: string;
  created_at:   string;
}

function loadHistory(): PasswordEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('sia_password_history') ?? '[]'); }
  catch { return []; }
}

function saveHistory(entries: PasswordEntry[]) {
  localStorage.setItem('sia_password_history', JSON.stringify(entries));
}

export default function RegistroPage() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role,     setRole]     = useState('Funcionario');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [history, setHistory]   = useState<PasswordEntry[]>([]);
  const [copied, setCopied]     = useState<string | null>(null);
  const [success, setSuccess]   = useState<PasswordEntry | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeErr, setRemoveErr] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadHistory();
    if (stored.length === 0) { setHistory([]); return; }
    // Cross-reference with backend: remove entries where user already changed password
    fetchUsers().then((users) => {
      const stillPending = stored.filter((entry) => {
        const user = users.find((u) => u.id === entry.user_id);
        return user?.must_change_password === true;
      });
      if (stillPending.length !== stored.length) saveHistory(stillPending);
      setHistory(stillPending);
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
        user_id:      data.user_id,
        name:         fullName.trim(),
        username:     username.trim(),
        role:         data.role,
        temp_password: data.temp_password,
        created_at:   new Date().toISOString(),
      };
      const updated = [entry, ...loadHistory()];
      saveHistory(updated);
      setHistory(updated);
      setSuccess(entry);
      setFullName(''); setUsername(''); setRole('Funcionario');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function removeFromHistory(entry: PasswordEntry) {
    if (!confirm(`Excluir permanentemente a conta de "${entry.name}" (${entry.username})?\n\nIsso removerá o usuário do sistema e não poderá ser desfeito.`)) return;
    setRemoving(entry.user_id);
    setRemoveErr(null);
    try {
      await deleteUser(entry.user_id);
      const updated = history.filter((historyEntry) => historyEntry.user_id !== entry.user_id);
      saveHistory(updated);
      setHistory(updated);
      if (success?.user_id === entry.user_id) setSuccess(null);
    } catch (err: unknown) {
      setRemoveErr(err instanceof Error ? err.message : 'Erro ao excluir usuário.');
    } finally {
      setRemoving(null);
    }
  }

  const selectedRole = ROLES.find((roleOption) => roleOption.value === role)!;

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <h1>Cadastrar Colaborador</h1>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', display: 'flex', gap: '32px', alignItems: 'flex-start' }}>

        {/* ── Left: Form ── */}
        <div style={{ flex: '0 0 420px', maxWidth: '420px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
            Cadastre um novo colaborador. A senha temporária gerada deve ser repassada ao colaborador,
            que deverá redefini-la no primeiro acesso.
          </p>

          {/* Success alert */}
          {success && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              border: '1.5px solid #86efac',
              borderRadius: '12px',
              padding: '18px 20px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#166534' }}>Colaborador criado!</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#15803d', marginBottom: '12px' }}>
                Repasse as credenciais ao colaborador <strong>{success.name}</strong>:
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{
                  flex: 1, background: 'rgba(255,255,255,0.7)', borderRadius: '8px',
                  padding: '9px 14px', fontSize: '1rem', fontWeight: 700, color: '#14532d',
                  letterSpacing: '0.08em', fontFamily: 'monospace',
                }}>
                  {success.temp_password}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(success.temp_password, 'success')}
                  style={{
                    padding: '9px 16px', background: copied === 'success' ? '#166534' : '#16a34a',
                    color: '#fff', border: 'none', borderRadius: '8px',
                    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}
                >
                  {copied === 'success' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#166534', marginTop: '8px', opacity: 0.8 }}>
                A senha ficará salva no histórico abaixo até o colaborador efetuar o primeiro acesso.
              </p>
            </div>
          )}

          {/* Form card */}
          <div style={{
            background: '#fff',
            borderRadius: '14px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Novo colaborador</h2>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b778c', marginBottom: '6px' }}>
                  Nome completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: João Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%', padding: '10px 12px', border: '1.5px solid var(--border-light)',
                    borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
                    transition: 'border-color 0.15s', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-light)'; }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b778c', marginBottom: '6px' }}>
                  Nome de usuário
                </label>
                <input
                  type="text"
                  placeholder="joao.silva"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1.5px solid var(--border-light)',
                    borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
                    transition: 'border-color 0.15s', boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-light)'; }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b778c', marginBottom: '8px' }}>
                  Perfil de acesso
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ROLES.map((roleOption) => {
                    const active = role === roleOption.value;
                    return (
                      <label
                        key={roleOption.value}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 14px', borderRadius: '8px', cursor: 'pointer',
                          border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border-light)'}`,
                          background: active ? 'var(--primary-light)' : '#fff',
                          transition: 'all 0.14s',
                        }}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={roleOption.value}
                          checked={active}
                          onChange={() => setRole(roleOption.value)}
                          style={{ accentColor: 'var(--primary)', width: 16, height: 16, flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: active ? 'var(--primary)' : 'var(--text-primary)' }}>
                            {roleOption.label}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                            {roleOption.desc}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div style={{
                  color: '#bf2600', background: '#ffebe6', padding: '10px 14px',
                  borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px',
                  border: '1px solid #ffbdad',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: 700,
                  background: loading ? 'var(--text-muted)' : 'var(--primary)',
                  color: '#fff', border: 'none', borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                {loading ? 'Criando colaborador…' : `Criar como ${selectedRole.label}`}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right: Password History ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Histórico de senhas temporárias
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Colaboradores que ainda não trocaram a senha. Remova manualmente após confirmação.
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
              {history.length} entrada{history.length !== 1 ? 's' : ''}
            </span>
          </div>

          {removeErr && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: '#ffebe6', border: '1px solid #ffbdad', borderRadius: 8, color: '#bf2600', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{removeErr}</span>
              <button type="button" onClick={() => setRemoveErr(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bf2600', fontWeight: 700, fontSize: '1rem' }}>×</button>
            </div>
          )}

          {history.length === 0 ? (
            <div style={{
              background: '#fff', border: '1px solid var(--border-light)', borderRadius: '12px',
              padding: '40px 24px', textAlign: 'center',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border-light)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                Nenhuma senha temporária pendente.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((entry) => (
                <div
                  key={entry.user_id}
                  style={{
                    background: '#fff', border: '1px solid var(--border-light)',
                    borderRadius: '10px', padding: '16px 18px',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), #023a7a)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                      }}>
                        {entry.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{entry.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{entry.username}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                        background: entry.role === 'Admin' ? '#FFF0ED' : entry.role === 'Diretor' ? '#f3e8ff' : entry.role === 'Coordenador' ? '#fef3c7' : entry.role === 'Gerente' ? '#EEF3FA' : entry.role === 'Tecnico' ? '#e0f2fe' : entry.role === 'Estagiario' ? '#fdf4ff' : '#f0fdf4',
                        color: entry.role === 'Admin' ? '#ef4123' : entry.role === 'Diretor' ? '#7c3aed' : entry.role === 'Coordenador' ? '#b45309' : entry.role === 'Gerente' ? 'var(--primary)' : entry.role === 'Tecnico' ? '#0369a1' : entry.role === 'Estagiario' ? '#a21caf' : '#16a34a',
                      }}>
                        {entry.role}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <code style={{
                      flex: 1, background: '#f8f9fa', borderRadius: '6px',
                      padding: '8px 12px', fontSize: '0.9rem', fontWeight: 700,
                      color: '#172b4d', letterSpacing: '0.06em', fontFamily: 'monospace',
                      border: '1px solid #e8eaed',
                    }}>
                      {entry.temp_password}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(entry.temp_password, entry.user_id)}
                      style={{
                        padding: '8px 14px', background: copied === entry.user_id ? '#16a34a' : 'var(--primary)',
                        color: '#fff', border: 'none', borderRadius: '6px',
                        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      {copied === entry.user_id ? '✓ Copiado' : 'Copiar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromHistory(entry)}
                      disabled={removing === entry.user_id}
                      title="Excluir conta do sistema"
                      style={{
                        padding: '8px 10px', background: removing === entry.user_id ? '#f0f1f3' : '#ffebe6',
                        border: '1px solid #ffbdad', borderRadius: '6px',
                        color: removing === entry.user_id ? '#6b778c' : '#de350b',
                        fontSize: '0.78rem', fontWeight: 600,
                        cursor: removing === entry.user_id ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', flexShrink: 0,
                      }}
                    >
                      {removing === entry.user_id ? 'Excluindo…' : 'Excluir conta'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
