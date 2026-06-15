'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { setInitialPassword } from '@/lib/api';
import { getUser, getToken, setAuth, isRemembered } from '@/lib/auth';
import s from '../login/login.module.css';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [showConf, setShowConf]   = useState(false);

  useEffect(() => {
    const token = getToken();
    const user  = getUser();
    if (!token || !user) { router.replace('/login'); return; }
    // Se já trocou a senha, manda para o board
    if (!user.must_change_password) router.replace('/');
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPw.length < 6)      { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPw !== confirmPw)   { setError('As senhas não conferem.'); return; }

    setLoading(true);
    try {
      await setInitialPassword(newPw);

      const user  = getUser();
      const token = getToken();
      if (user && token) {
        setAuth(token, { ...user, must_change_password: false }, isRemembered());

        // Remove do histórico de senhas temporárias do admin
        try {
          const history = JSON.parse(localStorage.getItem('sia_password_history') ?? '[]');
          const updated = history.filter((e: { user_id: string }) => e.user_id !== user.user_id);
          localStorage.setItem('sia_password_history', JSON.stringify(updated));
        } catch { /* ignorar erros de localStorage */ }
      }

      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.page}>
      <div className={s.overlay} aria-hidden="true" />

      <div className={s.card}>
        <div className={s.logo}>
          <Image src="/logo-sia.svg" alt="SIA — Governo do Piauí" width={300} height={80}
            style={{ objectFit: 'contain', width: 'auto', height: '72px' }} priority />
        </div>

        <h1 className={s.title}>Defina sua senha</h1>
        <p className={s.subtitle}>
          Este é seu primeiro acesso. Crie uma senha pessoal para continuar.
        </p>

        <form className={s.form} onSubmit={handleSubmit} noValidate>
          <div className={s.field}>
            <label className={s.label} htmlFor="newPw">Nova senha</label>
            <div style={{ position: 'relative' }}>
              <input
                id="newPw"
                type={showNew ? 'text' : 'password'}
                className={s.input}
                placeholder="Mínimo 6 caracteres"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="off"
                autoFocus
                style={{ paddingRight: '44px' }}
              />
              <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1}
                title={showNew ? 'Ocultar senha' : 'Exibir senha'}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:4, color:'#adb5bd', lineHeight:0, display:'flex' }}>
                <EyeIcon open={showNew} />
              </button>
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="confirmPw">Confirmar senha</label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirmPw"
                type={showConf ? 'text' : 'password'}
                className={s.input}
                placeholder="Repita a senha"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="off"
                style={{ paddingRight: '44px' }}
              />
              <button type="button" onClick={() => setShowConf(v => !v)} tabIndex={-1}
                title={showConf ? 'Ocultar senha' : 'Exibir senha'}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:4, color:'#adb5bd', lineHeight:0, display:'flex' }}>
                <EyeIcon open={showConf} />
              </button>
            </div>
          </div>

          {error && <p className={s.error}>{error}</p>}

          <button type="submit" className={s.button} disabled={loading}>
            {loading ? <span className={s.spinner} /> : 'Salvar senha e entrar'}
          </button>
        </form>

        <p className={s.footer}>© 2026 Secretaria de Inteligência Artificial, Economia Digital, Ciência, Tecnologia e Inovação - SIA</p>
      </div>
    </div>
  );
}
