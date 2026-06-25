'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import { setAuth, isAuthenticated } from '@/lib/auth';
import s from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername]  = useState('');
  const [password, setPassword]  = useState('');
  const [remember, setRemember]  = useState(false);
  const [error, setError]        = useState('');
  const [loading, setLoading]    = useState(false);
  const [showPw, setShowPw]      = useState(false);

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
      setAuth(data.token, {
        user_id: data.user_id,
        name: data.name,
        role: data.role,
        username: data.username,
        must_change_password: data.must_change_password,
      }, remember);
      router.replace(data.must_change_password ? '/redefinir-senha' : '/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.page}>
      <div className={s.overlay} aria-hidden="true" />

      <div className={s.card}>
        {/* Logo — removida por período eleitoral, favicon temporário */}
        <div className={s.logo} style={{ display: 'flex', justifyContent: 'center' }}>
          <Image src="/favicon.ico" alt="SIA" width={64} height={64} priority />
        </div>

        {/* Título */}
        <h1 className={s.title}>Acesse sua conta</h1>
        <p className={s.subtitle}>Sistema de Gestão da DEDG</p>

        <form className={s.form} onSubmit={handleSubmit} noValidate>
          {/* Usuário */}
          <div className={s.field}>
            <label className={s.label} htmlFor="username">Usuário</label>
            <input
              id="username"
              type="text"
              className={s.input}
              placeholder="seu.usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          {/* Senha */}
          <div className={s.field}>
            <label className={s.label} htmlFor="password">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className={s.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                tabIndex={-1}
                title={showPw ? 'Ocultar senha' : 'Exibir senha'}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#adb5bd', lineHeight: 0, display: 'flex' }}
              >
                {showPw ? (
                  <Eye width={18} height={18} />
                ) : (
                  <EyeOff width={18} height={18} />
                )}
              </button>
            </div>
          </div>

          {/* Checkbox */}
          <label className={s.checkboxRow}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className={s.checkboxLabel}>Manter-me conectado</span>
          </label>

          {/* Erro */}
          {error && <p className={s.error}>{error}</p>}

          {/* Botão */}
          <button type="submit" className={s.button} disabled={loading}>
            {loading ? <span className={s.spinner} /> : 'Entrar'}
          </button>
        </form>

        <p className={s.footer}>© 2026 Secretaria de Inteligência Artificial, Economia Digital, Ciência, Tecnologia e Inovação - SIA</p>
      </div>
    </div>
  );
}
