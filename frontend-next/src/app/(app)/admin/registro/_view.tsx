﻿'use client';

import { useState, useEffect } from 'react';
import { registerUser, deleteUser, fetchAllUsers } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ToastContainer';
import ConfirmModal from '@/components/ConfirmModal';
import { Check, Copy, Trash2, RefreshCw, Lock, FileDown } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const ROLES: { value: string; label: string; desc: string; color: string }[] = [
  { value: 'Estagiario',  label: 'Estagiário(a)',   desc: 'Tarefas atribuídas',      color: '#9333ea' },
  { value: 'Funcionario', label: 'Funcionário(a)',   desc: 'Acesso padrão',           color: '#1B8A4B' },
  { value: 'Tecnico',     label: 'Técnico(a)',       desc: 'Projetos e atividades',   color: 'var(--blue)' },
  { value: 'Coordenador', label: 'Coordenador(a)',   desc: 'Coordena equipes',        color: '#A87A00' },
  { value: 'Gerente',     label: 'Gerente',          desc: 'Atividades e relatórios', color: 'var(--blue)' },
  { value: 'Diretor',     label: 'Diretor(a)',       desc: 'Visão estratégica',       color: '#072f63' },
  { value: 'Admin',       label: 'Administrador(a)', desc: 'Acesso total ao sistema', color: '#b42318' },
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
  const [copiedComunicado, setCopiedComunicado] = useState(false);
  const [success, setSuccess]     = useState<PasswordEntry | null>(null);
  const [removing, setRemoving]   = useState<string | null>(null);
  const [removeErr, setRemoveErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PasswordEntry | null>(null);

  function gerarComunicado(entries: PasswordEntry[]): string {
    const credenciais = entries.map(e =>
      `${e.name}\nUsuário: ${e.username}\nSenha provisória: ${e.temp_password}`
    ).join('\n\n');

    return `Segue as credenciais de acesso para a ferramenta de gestão:

${credenciais}

Primeiramente, acessem: https://vyntra-livid.vercel.app

Após o login, será possível alterar a senha provisória para uma senha definitiva.

As atividades já cadastradas estão vinculadas aos seus respectivos responsáveis, conforme estavam anteriormente.

Qualquer problema ou dúvida, podem me avisar.

Lembrando que existe uma aba de Feedback na ferramenta para reportar problemas, dúvidas e sugestões de melhoria.`;
  }

  async function handleCopiarComunicado() {
    await navigator.clipboard.writeText(gerarComunicado(history));
    setCopiedComunicado(true);
    setTimeout(() => setCopiedComunicado(false), 2500);
  }

  useEffect(() => {
    if (!usernameTouched && fullName) setUsername(toUsername(fullName));
    if (!fullName) { setUsername(''); setUsernameTouched(false); }
  }, [fullName, usernameTouched]);

  useEffect(() => {
    const stored = loadHistory();
    if (stored.length === 0) { setHistory([]); return; }
    fetchAllUsers().then(users => {
      const pending = stored.filter(e => {
        const found = users.find(u => u.id === e.user_id);
        return !found || found.must_change_password === true;
      });
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
  const [regTab, setRegTab] = useState<'form' | 'senhas'>('form');

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: 'none', border: 'none', padding: '0 0 4px',
    fontSize: '0.86rem', fontWeight: active ? 600 : 400,
    color: active ? 'var(--text)' : 'var(--text-3)',
    cursor: 'pointer', borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
    letterSpacing: '-0.1px', fontFamily: 'inherit',
  });

  const previewInitials = fullName.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '??';
  const previewRole = selectedRole;

  return (
    <>
      <PageHeader eyebrow="Controle de acesso · Admin" title="Cadastrar usuário" />

      {/* Sub-tabs: Cadastrar / Senhas pendentes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 32px 0' }}>
        <button onClick={() => setRegTab('form')} style={tabStyle(regTab === 'form')}>Cadastrar</button>
        <button onClick={() => setRegTab('senhas')} style={tabStyle(regTab === 'senhas')}>
          Senhas pendentes
          {history.length > 0 && (
            <span className="mono" style={{ marginLeft: 8, background: 'rgba(224,169,46,0.15)', color: '#A87A00', padding: '1px 7px', borderRadius: 3, fontSize: '0.62rem', fontWeight: 600 }}>
              {history.length}
            </span>
          )}
        </button>
      </div>

      {regTab === 'form' && (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 328px', alignItems: 'start', borderTop: '1px solid var(--line-1)', marginTop: 18, flex: 1, overflowY: 'auto' }}>

        {/* LEFT: form */}
        <div style={{ padding: '30px 32px 48px', borderRight: '1px solid var(--line-1)' }}>
          <div style={{ maxWidth: 560 }}>

            {/* Success banner */}
            {success && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 3, padding: '16px 18px', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 3, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="#fff" strokeWidth={2.5} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#166534' }}>Colaborador criado!</span>
                  <button onClick={() => setSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontSize: '1rem', lineHeight: 1 }}>×</button>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#15803d', marginBottom: 10 }}>
                  Senha temporária de <strong>{success.name}</strong>:
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <code style={{ flex: 1, background: 'rgba(255,255,255,0.8)', borderRadius: 3, padding: '8px 12px', fontSize: '0.96rem', fontWeight: 700, color: '#14532d', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                    {success.temp_password}
                  </code>
                  <button type="button" onClick={() => handleCopy(success.temp_password, 'success')}
                    style={{ padding: '8px 14px', background: copied === 'success' ? '#166534' : '#16a34a', color: '#fff', border: 'none', borderRadius: 3, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    {copied === 'success' ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            {/* 01 · Dados do colaborador */}
            <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--blue)' }}>
              01 · Dados do colaborador
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
              <div>
                <label className="mono" style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Nome completo</label>
                <input type="text" placeholder="Ex: João Silva" value={fullName} onChange={e => setFullName(e.target.value)} autoFocus
                  style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.9rem', background: 'var(--surface)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = 'inset 0 0 0 1px var(--blue)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }} />
              </div>
              <div>
                <label className="mono" style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>
                  Nome de usuário
                  {!usernameTouched && fullName && <span className="mono" style={{ marginLeft: 6, fontSize: '0.62rem', color: 'var(--blue)', fontWeight: 600, background: 'var(--blue)0d', borderRadius: 3, padding: '1px 5px' }}>auto</span>}
                </label>
                <div className="mono" style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', overflow: 'hidden' }}>
                  <span style={{ padding: '11px 8px 11px 13px', color: 'var(--text-3)', fontSize: '0.84rem' }}>@</span>
                  <input type="text" placeholder="joao.silva" value={username}
                    onChange={e => { setUsername(e.target.value); setUsernameTouched(true); }}
                    style={{ flex: 1, minWidth: 0, padding: '11px 13px 11px 2px', border: 'none', background: 'none', fontSize: '0.9rem', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>
            </div>

            {/* 02 · Perfil de acesso */}
            <div className="mono" style={{ fontSize: '0.66rem', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--blue)', marginTop: 32 }}>
              02 · Perfil de acesso
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
              {availableRoles.map(r => {
                const active = role === r.value;
                return (
                  <div key={r.value} onClick={() => setRole(r.value)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 13px', borderRadius: 3, border: `1.5px solid ${active ? r.color : 'var(--border)'}`, background: active ? r.color + '0d' : 'var(--surface)', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: r.color, flexShrink: 0, marginTop: 3 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{r.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 2 }}>{r.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div style={{ color: '#b42318', background: 'rgba(180,35,24,0.07)', padding: '10px 13px', borderRadius: 3, fontSize: '0.83rem', border: '1px solid rgba(180,35,24,0.18)', marginTop: 16 }}>{error}</div>
            )}

            <button type="button" onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: 13, border: 'none', borderRadius: 3, background: loading ? 'var(--text-3)' : 'var(--blue)', color: '#fff', fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 30, transition: 'background 0.12s' }}>
              {loading ? <><RefreshCw size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />Criando…</> : 'Criar colaborador'}
            </button>
          </div>
        </div>

        {/* RIGHT: preview card */}
        <div style={{ padding: '30px 28px 48px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <div className="mono" style={{ fontSize: '0.64rem', fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Pré-visualização</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden', background: 'var(--surface)' }}>
              <div style={{ height: 58, background: '#072f63' }} />
              <div style={{ padding: '0 18px 20px', marginTop: -30 }}>
                <div className="mono" style={{ width: 60, height: 60, borderRadius: '50%', background: previewRole.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', fontWeight: 600, border: '3px solid var(--surface)', boxShadow: '0 1px 4px rgba(7,22,45,.18)' }}>
                  {previewInitials}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginTop: 12, letterSpacing: '-0.2px' }}>
                  {fullName || 'Nome do colaborador'}
                </div>
                <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-3)', letterSpacing: '0.3px', marginTop: 2 }}>
                  @{username || 'usuario'}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 14, padding: '4px 11px', border: '1px solid var(--border)', borderRadius: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: previewRole.color, flexShrink: 0 }} />
                  <span className="mono" style={{ fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: previewRole.color }}>{previewRole.label}</span>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-2)', lineHeight: 1.55, marginTop: 12 }}>{previewRole.desc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {regTab === 'senhas' && (
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 3, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-1)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={15} color="#A87A00" strokeWidth={2} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>Senhas temporárias aguardando entrega</div>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleCopiarComunicado}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 3, background: copiedComunicado ? '#f0fdf4' : 'var(--surface)', color: copiedComunicado ? '#157F3C' : 'var(--text-2)', fontSize: '0.74rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', flexShrink: 0 }}
                onMouseEnter={e => { if (!copiedComunicado) { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)'; }}}
                onMouseLeave={e => { if (!copiedComunicado) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}}
              >
                {copiedComunicado ? <Check size={13} /> : <FileDown size={13} />}
                {copiedComunicado ? 'Copiado!' : 'Copiar comunicado'}
              </button>
            )}
            <span className="mono" style={{ background: history.length > 0 ? 'rgba(224,169,46,0.1)' : 'var(--surface-2)', color: history.length > 0 ? '#A87A00' : 'var(--text-3)', borderRadius: 3, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
              {history.length} pendente{history.length !== 1 ? 's' : ''}
            </span>
          </div>

          {removeErr && (
            <div style={{ margin: '12px 20px 0', padding: '10px 13px', background: 'rgba(180,35,24,0.07)', border: '1px solid rgba(180,35,24,0.18)', borderRadius: 3, color: '#b42318', fontSize: '0.83rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{removeErr}</span>
              <button onClick={() => setRemoveErr(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b42318', fontWeight: 700 }}>×</button>
            </div>
          )}

          {history.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
              Nenhuma senha temporária pendente.
            </div>
          ) : (
            <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 200px 90px', gap: 16, padding: '10px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line-1)' }}>
              {['Colaborador', 'Perfil', 'Senha temporária', ''].map((h, i) => (
                <span key={i} className="mono" style={{ fontSize: '0.62rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</span>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {history.map((entry, idx) => {
                const roleInfo = ROLES.find(r => r.value === entry.role);
                const eInitials = entry.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                const aColor = roleInfo?.color ?? 'var(--blue)';
                const copyId = `pw-${entry.user_id}`;
                return (
                  <div key={entry.user_id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 200px 90px', gap: 16, alignItems: 'center', padding: '14px 20px', borderBottom: idx < history.length - 1 ? '1px solid var(--line-2)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    {/* Col 1: avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div className="mono" style={{ width: 32, height: 32, borderRadius: '50%', background: aColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 600, flexShrink: 0 }}>{eInitials}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</div>
                        <div className="mono" style={{ fontSize: '0.64rem', color: 'var(--text-3)', letterSpacing: '0.3px' }}>@{entry.username}</div>
                      </div>
                    </div>
                    {/* Col 2: perfil */}
                    <span className="mono" style={{ fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: aColor, background: aColor + '14', padding: '3px 8px', borderRadius: 3, justifySelf: 'start' }}>{roleInfo?.label ?? entry.role}</span>
                    {/* Col 3: senha temporária */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <code className="mono" style={{ flex: 1, minWidth: 0, background: 'rgba(224,169,46,0.08)', border: '1px solid rgba(224,169,46,0.25)', borderRadius: 3, padding: '5px 10px', fontSize: '0.82rem', fontWeight: 700, color: '#7a5800', letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.temp_password}
                      </code>
                      <button type="button" onClick={() => handleCopy(entry.temp_password, copyId)} title="Copiar senha"
                        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 3, background: copied === copyId ? '#16a34a' : 'var(--surface)', color: copied === copyId ? '#fff' : 'var(--text-3)', cursor: 'pointer' }}>
                        {copied === copyId ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
                      </button>
                    </div>
                    {/* Col 4: remover */}
                    <button onClick={() => setConfirmDelete(entry)} disabled={removing === entry.user_id}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--text-2)', fontSize: '0.7rem', fontWeight: 500, cursor: removing === entry.user_id ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                      <Trash2 size={11} />Remover
                    </button>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>
      </div>
      )}


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
