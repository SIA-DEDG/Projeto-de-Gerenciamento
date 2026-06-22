'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { setAuth, isAuthenticated } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);

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
      setAuth(data.token, { user_id: data.user_id, name: data.name, role: data.role, username: data.username, must_change_password: data.must_change_password }, remember);
      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Painel esquerdo — navy */}
      <div className="login-panel-left">
        <div className="login-brand">
          <div className="login-brand-mark">TS</div>
          <div className="login-brand-name">Tasks SIA</div>
          <div className="login-brand-sub">DEDG · Governo do Piauí</div>
        </div>
        <div className="login-headline">
          <h2>Gestão de atividades da Diretoria de Economia Digital</h2>
          <p>Acompanhe projetos, atividades, faltas e eventos da equipe em um só lugar.</p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="login-panel-right">
        <div className="login-form-card">
          <h1 className="login-form-title">Acesse sua conta</h1>
          <p className="login-form-sub">Sistema de Gestão da DEDG — Governo do Piauí</p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label className="login-label" htmlFor="username">Usuário</label>
              <input id="username" type="text" className="login-input" placeholder="seu.usuario" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">Senha</label>
              <div style={{ position: 'relative' }}>
                <input id="password" type={showPw ? 'text' : 'password'} className="login-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={{ paddingRight: 40, width: '100%' }} />
                <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 3 }}>
                  {showPw ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.78rem', color: 'var(--text-2)', cursor: 'pointer', marginTop: -2 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: 'var(--blue)', cursor: 'pointer' }} />
              Manter-me conectado
            </label>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p style={{ marginTop: 28, fontSize: '0.68rem', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>
            © 2026 SIA — Secretaria de Inteligência Artificial
          </p>
        </div>
      </div>
    </div>
  );
}
