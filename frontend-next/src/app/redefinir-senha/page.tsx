'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { changePassword } from '@/lib/api';
import { getUser, isAuthenticated, isRemembered } from '@/lib/auth';

const USER_KEY = 'sia_user';

function markPasswordChanged() {
  const user = getUser();
  if (!user) return;
  const updated = { ...user, must_change_password: false };
  const store = isRemembered() ? localStorage : sessionStorage;
  store.setItem(USER_KEY, JSON.stringify(updated));
}

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showCur, setShowCur]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    const user = getUser();
    if (!user?.must_change_password) { router.replace('/'); return; }
    setUserName(user.name);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!current) { setError('Digite sua senha atual.'); return; }
    if (next.length < 6) { setError('A nova senha deve ter pelo menos 6 caracteres.'); return; }
    if (next !== confirm) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      await changePassword(current, next);
      markPasswordChanged();
      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 42px 11px 14px', border: '1.5px solid #dde2ea',
    borderRadius: 3, fontSize: '0.9rem', background: '#f8f9fb', color: '#11161D',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    transition: 'border-color 0.12s, box-shadow 0.12s',
  };

  return (
    <div style={{ height: '100vh', display: 'flex', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* ── Esquerda: imagem ── */}
      <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
        <img src="/background.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>

      {/* ── Direita: formulário ── */}
      <div style={{ width: 600, maxWidth: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px', background: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* Faixa Gov-PI */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, background: 'linear-gradient(90deg, var(--blue) 0 40%, #E0A92E 40% 55%, #b42318 55% 75%, #1B8A4B 75%)' }} />

        {/* Ícone + título */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 3, background: '#072f63', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E0A92E', fontSize: 26, lineHeight: 1, boxShadow: '0 0 0 6px rgba(7,47,99,0.08)' }}>★</div>
          <div style={{ marginTop: 11, fontWeight: 700, fontSize: '1.08rem', color: '#072f63' }}>Tasks SIA</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#9aa1ac', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: 3 }}>Sistema de Gestão · DEDG</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <Lock size={16} color="#A87A00" />
          <h1 style={{ fontSize: '1.45rem', fontWeight: 600, color: '#11161D', letterSpacing: '-0.5px', margin: 0 }}>Crie sua senha</h1>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#6b7280', textAlign: 'center', margin: '0 0 28px', lineHeight: 1.5 }}>
          {userName ? `Olá, ${userName.split(' ')[0]}! ` : ''}Por segurança, defina uma nova senha para continuar.
        </p>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Senha atual */}
          <div>
            <label className="mono" style={{ display: 'block', fontSize: '0.66rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: '#6b7280', marginBottom: 7 }}>Senha atual (temporária)</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCur ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Senha que você usou para entrar"
                autoFocus
                autoComplete="current-password"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px var(--primary-light)'; }}
                onBlur={(e)  => { e.target.style.borderColor = '#dde2ea'; e.target.style.background = '#f8f9fb'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowCur(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9aa1ac', display: 'flex', padding: 4 }}>
                {showCur ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          {/* Nova senha */}
          <div>
            <label className="mono" style={{ display: 'block', fontSize: '0.66rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: '#6b7280', marginBottom: 7 }}>Nova senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px var(--primary-light)'; }}
                onBlur={(e)  => { e.target.style.borderColor = '#dde2ea'; e.target.style.background = '#f8f9fb'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9aa1ac', display: 'flex', padding: 4 }}>
                {showNew ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          {/* Confirmar nova senha */}
          <div>
            <label className="mono" style={{ display: 'block', fontSize: '0.66rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: '#6b7280', marginBottom: 7 }}>Confirmar nova senha</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              style={{ ...inputStyle, padding: '11px 14px' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px var(--primary-light)'; }}
              onBlur={(e)  => { e.target.style.borderColor = '#dde2ea'; e.target.style.background = '#f8f9fb'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(180,35,24,0.06)', border: '1px solid rgba(180,35,24,0.2)', borderRadius: 3, fontSize: '0.82rem', color: '#b42318' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 13, border: 'none', borderRadius: 3, background: loading ? '#5a8ad4' : '#072f63', color: '#fff', fontSize: '0.92rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, fontFamily: 'inherit', transition: 'background 0.12s' }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#0a3d7a'; }}
            onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#072f63'; }}
          >
            {loading ? 'Salvando…' : (
              <>Definir senha <ArrowRight size={16} strokeWidth={2} /></>
            )}
          </button>
        </form>

        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#9aa1ac', letterSpacing: '0.5px', lineHeight: 1.7, textAlign: 'center', marginTop: 32 }}>
          © 2026 Secretaria de Inteligência Artificial<br />
          Economia Digital, Ciência, Tecnologia e Inovação — SIA
        </div>
      </div>
    </div>
  );
}
