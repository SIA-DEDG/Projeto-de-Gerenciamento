'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { login, clearAllCache } from '@/lib/api';
import { setAuth, isAuthenticated } from '@/lib/auth';
import BrandStripe from '@/components/BrandStripe';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) router.replace('/');
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Preencha usuário e senha.'); return; }
    setLoading(true);
    try {
      const data = await login(username, password);
      clearAllCache();
      setAuth(data.token, {
        user_id: data.user_id, name: data.name, role: data.role,
        username: data.username, must_change_password: data.must_change_password,
        directoria_id: data.directoria_id ?? null,
        directoria_name: data.directoria_name ?? null,
        directoria_color: data.directoria_color ?? null,
      }, rememberMe);
      router.replace(data.must_change_password ? '/redefinir-senha' : '/');
    } catch (err: unknown) {
      setError('Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* ── Esquerda: imagem ── */}
      <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
        <img src="/background.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>

      {/* ── Direita: formulário ── */}
      <div style={{ width: 600, maxWidth: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px', background: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* Faixa institucional (listras da bandeira do PI) — cor via --brand-stripe */}
        <BrandStripe style={{ position: 'absolute', left: 0, right: 0, top: 0 }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 3, background: '#072f63', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E0A92E', fontSize: 26, lineHeight: 1, boxShadow: '0 0 0 6px rgba(7,47,99,0.08)' }}>
            <img style={{ width: 50 }} src="favicon.ico" alt="" />
          </div>
          <div style={{ marginTop: 11, fontWeight: 700, fontSize: '1.08rem', color: '#072f63', letterSpacing: '-0.2px' }}>Tasks SIA</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', color: '#9aa1ac', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: 3 }}>Sistema de Gestão · DEDG</div>
        </div>

        <h1 style={{ fontSize: '1.45rem', fontWeight: 600, color: '#11161D', textAlign: 'center', letterSpacing: '-0.5px', margin: '0 0 6px' }}>Acesse sua conta</h1>
        <p style={{ fontSize: '0.82rem', color: '#6b7280', textAlign: 'center', margin: '0 0 28px', lineHeight: 1.5 }}>Sistema de Gestão da DEDG</p>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label className="mono" style={{ display: 'block', fontSize: '0.66rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: '#6b7280', marginBottom: 7 }}>Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="seu.usuario"
              autoFocus
              autoComplete="username"
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #dde2ea', borderRadius: 3, fontSize: '0.9rem', background: '#f8f9fb', color: '#11161D', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.12s, box-shadow 0.12s' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px var(--primary-light)'; }}
              onBlur={(e)  => { e.target.style.borderColor = '#dde2ea'; e.target.style.background = '#f8f9fb'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div>
            <label className="mono" style={{ display: 'block', fontSize: '0.66rem', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: '#6b7280', marginBottom: 7 }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ width: '100%', padding: '11px 44px 11px 14px', border: '1.5px solid #dde2ea', borderRadius: 3, fontSize: '0.9rem', background: '#f8f9fb', color: '#11161D', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.12s, box-shadow 0.12s' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px var(--primary-light)'; }}
                onBlur={(e)  => { e.target.style.borderColor = '#dde2ea'; e.target.style.background = '#f8f9fb'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPassword((prev) => !prev)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9aa1ac', display: 'flex', padding: 4 }}>
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--blue)', cursor: 'pointer' }} />
              <span style={{ fontSize: '0.82rem', color: '#344563' }}>Manter-me conectado</span>
            </label>
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
            {loading ? 'Entrando…' : (
              <>
                Entrar
                <ArrowRight size={16} strokeWidth={2} />
              </>
            )}
          </button>
        </form>

        <div style={{ fontFamily: "'inter', monospace", fontSize: '0.62rem', color: '#9aa1ac', letterSpacing: '0.5px', lineHeight: 1.7, textAlign: 'center', marginTop: 32 }}>
          © 2026 Secretaria de Inteligência Artificial<br />
          Economia Digital, Ciência, Tecnologia e Inovação — SIA
        </div>
      </div>
    </div>
  );
}
