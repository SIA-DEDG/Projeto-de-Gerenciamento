'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
        user_id:              data.user_id,
        name:                 data.name,
        role:                 data.role,
        username:             data.username,
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
        {/* Logo */}
        <div className={s.logo}>
          <Image
            src="/logo-sia.svg"
            alt="Secretaria de Inteligência Artificial — Governo do Piauí"
            width={300}
            height={80}
            style={{ objectFit: 'contain', width: 'auto', height: '72px' }}
            priority
          />
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
            <input
              id="password"
              type="password"
              className={s.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
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
