'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, setAuth, getToken, isRemembered, clearAuth } from '@/lib/auth';
import { changePassword, updateUserProfile } from '@/lib/api';
import { getSettings, saveSettings } from '@/lib/localStorage';
import type { Settings } from '@/types';
import {
  User, Lock, Shield, LogOut, Check, RefreshCw, Save,
  Mail, AlertTriangle, Bell,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────

function userInitials(name: string | undefined): string {
  if (!name) return 'SIA';
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Avatar Hero Card ──────────────────────────────────────────────────────────

function AvatarHeroCard() {
  const user = getUser();
  const inits = userInitials(user?.name);

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      padding: '24px 26px',
      borderRadius: 3,
      background: '#072f63',
      overflow: 'hidden',
      marginBottom: 34,
    }}>
      {/* Stripe colorida à esquerda */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 6,
        background: 'linear-gradient(#034EA2 0 38%, #E0A92E 38% 62%, #1B8A4B 62% 100%)',
      }} />

      {/* Avatar */}
      <div className="mono" style={{
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'rgba(255,255,255,.16)',
        color: '#fff',
        fontSize: '1.3rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: '1px solid rgba(255,255,255,.28)',
        marginLeft: 6,
      }}>
        {inits}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '1.18rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
          {user?.name ?? '—'}
        </div>
        <div className="mono" style={{
          fontSize: '0.72rem',
          color: 'rgba(255,255,255,.82)',
          letterSpacing: '0.4px',
          marginTop: 4,
        }}>
          {user?.username ?? '—'}
        </div>
        {user?.role && (
          <div style={{
            display: 'inline-block',
            marginTop: 8,
            background: 'rgba(255,255,255,.2)',
            padding: '4px 11px',
            borderRadius: 3,
            color: '#fff',
            fontSize: '0.68rem',
            fontWeight: 500,
          }}>
            {user.role}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tint?: string;
}

function SectionHeader({ icon, title, subtitle, tint = 'rgba(3,78,162,0.08)' }: SectionHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 3,
        background: tint,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: tint.includes('E0A92E') ? '#A87A00' : '#034EA2',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: '0.73rem', color: 'var(--text-3)' }}>{subtitle}</div>
      </div>
    </div>
  );
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function ProfileRow({ icon, label, value }: InfoRowProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 0',
      borderBottom: '1px solid var(--line-2)',
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 3,
        background: 'var(--surface-2)',
        border: '1px solid var(--line-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: 'var(--text-3)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>{label}</div>
      <div style={{ fontSize: '0.84rem', color: 'var(--text-2)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ── Inputs de formulário ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  border: '1px solid var(--border)',
  borderRadius: 3,
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  color: 'var(--text)',
  background: 'var(--surface)',
  outline: 'none',
  transition: 'border-color 0.12s, box-shadow 0.12s',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: '0.63rem',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: 'var(--text-3)',
  marginBottom: 6,
  display: 'block',
};

function InputField({
  id, label, type = 'text', value, onChange, placeholder, disabled,
}: {
  id: string; label: string; type?: string; value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 14 }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="new-password"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle,
          borderColor: focused ? '#034EA2' : 'var(--border)',
          boxShadow: focused ? '0 0 0 3px #034EA21f' : 'none',
          background: disabled ? 'var(--surface-2)' : 'var(--surface)',
          color: disabled ? 'var(--text-3)' : 'var(--text)',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
    </div>
  );
}

// ── Seção Perfil ──────────────────────────────────────────────────────────────

function PerfilSection() {
  const [user, setUser]         = useState<ReturnType<typeof getUser>>(null);
  const [name, setName]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setName(u?.name ?? '');
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!name.trim()) { setFeedback({ type: 'error', msg: 'O nome não pode estar vazio.' }); return; }
    setLoading(true);
    try {
      await updateUserProfile(name.trim());
      const token = getToken();
      if (user && token) setAuth(token, { ...user, name: name.trim() }, isRemembered());
      setFeedback({ type: 'success', msg: 'Perfil atualizado com sucesso.' });
    } catch (err: unknown) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao salvar.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <SectionHeader
        icon={<User size={15} strokeWidth={2} />}
        title="Perfil"
        subtitle="Dados pessoais e informações da conta"
      />

      <div style={{ borderTop: '1px solid var(--line-1)', marginBottom: 6 }} />

      <ProfileRow
        icon={<User size={14} strokeWidth={2} />}
        label="Nome"
        value={user?.name ?? '—'}
      />
      <ProfileRow
        icon={<span className="mono" style={{ fontSize: '0.6rem', fontWeight: 600 }}>@</span>}
        label="Usuário"
        value={<span className="mono" style={{ fontSize: '0.82rem' }}>{user?.username ?? '—'}</span>}
      />
      <ProfileRow
        icon={<Mail size={14} strokeWidth={2} />}
        label="E-mail"
        value={<span className="mono" style={{ fontSize: '0.82rem' }}>{user?.username ?? '—'}</span>}
      />
      <ProfileRow
        icon={<Shield size={14} strokeWidth={2} />}
        label="Cargo"
        value={
          <span style={{
            display: 'inline-block',
            padding: '2px 9px',
            borderRadius: 3,
            background: 'rgba(3,78,162,0.08)',
            color: '#034EA2',
            fontSize: '0.72rem',
            fontWeight: 600,
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {user?.role ?? '—'}
          </span>
        }
      />

      {/* Editar nome */}
      <form onSubmit={handleSave} style={{ marginTop: 24, maxWidth: 380 }}>
        {/* Aviso */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '10px 13px',
          background: 'rgba(224,169,46,0.08)',
          border: '1px solid rgba(224,169,46,0.3)',
          borderRadius: 3,
          marginBottom: 16,
        }}>
          <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0, color: '#A87A00', marginTop: 1 }} />
          <p style={{ fontSize: '0.75rem', color: '#78530a', lineHeight: 1.5, margin: 0 }}>
            <strong style={{ display: 'block', marginBottom: 2 }}>Atenção: o nome é usado na importação via planilha.</strong>
            Alterar quebra o vínculo com a coluna de responsável.
          </p>
        </div>

        <InputField
          id="pf-name"
          label="Nome de exibição"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              background: '#034EA2',
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              fontSize: '0.82rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.12s',
            }}
          >
            {loading
              ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Salvando…</>
              : <><Save size={13} /> Salvar alterações</>
            }
          </button>
          {feedback && (
            <span style={{
              fontSize: '0.78rem',
              color: feedback.type === 'success' ? '#1B8A4B' : '#b42318',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              {feedback.type === 'success' && <Check size={12} strokeWidth={2.5} />}
              {feedback.msg}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

// ── Seção Segurança ───────────────────────────────────────────────────────────

function SegurancaSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (newPassword.length < 6)           { setFeedback({ type: 'error', msg: 'A nova senha deve ter pelo menos 6 caracteres.' }); return; }
    if (newPassword !== confirmPassword)  { setFeedback({ type: 'error', msg: 'As senhas não conferem.' }); return; }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setFeedback({ type: 'success', msg: 'Senha alterada com sucesso.' });
    } catch (err: unknown) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao alterar senha.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: 40 }}>
      <SectionHeader
        icon={<Shield size={15} strokeWidth={2} />}
        title="Segurança"
        subtitle="Mantenha sua conta segura"
        tint="rgba(224,169,46,0.12)"
      />
      <div style={{ borderTop: '1px solid var(--line-1)', marginBottom: 20 }} />

      <form onSubmit={handleSave} style={{ maxWidth: 380 }}>
        <InputField
          id="sec-current"
          label="Senha atual"
          type="password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          placeholder="Digite sua senha atual"
        />
        <InputField
          id="sec-new"
          label="Nova senha"
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />
        <InputField
          id="sec-confirm"
          label="Confirmar nova senha"
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Repita a nova senha"
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              background: '#034EA2',
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              fontSize: '0.82rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.12s',
            }}
          >
            {loading
              ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Salvando…</>
              : <><Lock size={13} /> Alterar senha</>
            }
          </button>
          {feedback && (
            <span style={{
              fontSize: '0.78rem',
              color: feedback.type === 'success' ? '#1B8A4B' : '#b42318',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              {feedback.type === 'success' && <Check size={12} strokeWidth={2.5} />}
              {feedback.msg}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

// ── Seção Aparência ───────────────────────────────────────────────────────────

function AparenciaSection() {
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('sia-theme') === 'dark'
  );

  function toggleTheme(next: boolean) {
    setIsDark(next);
    localStorage.setItem('sia-theme', next ? 'dark' : 'light');
    const root = document.querySelector('.app-container');
    if (root) {
      if (next) root.classList.add('theme-dark');
      else root.classList.remove('theme-dark');
    }
  }

  return (
    <section style={{ marginTop: 40 }}>
      <SectionHeader
        icon={<Bell size={15} strokeWidth={2} />}
        title="Aparência"
        subtitle="Tema da interface"
      />
      <div style={{ borderTop: '1px solid var(--line-1)', marginBottom: 16 }} />

      {/* Segmented tema */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        borderBottom: '1px solid var(--line-2)',
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>Tema da interface</div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', marginTop: 2 }}>
            A preferência é salva automaticamente
          </div>
        </div>
        <div className="segmented">
          <button
            className={`segmented-btn${!isDark ? ' active' : ''}`}
            onClick={() => toggleTheme(false)}
            type="button"
          >
            Claro
          </button>
          <button
            className={`segmented-btn${isDark ? ' active' : ''}`}
            onClick={() => toggleTheme(true)}
            type="button"
          >
            Escuro
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Seção Conta (logout) ──────────────────────────────────────────────────────

function ContaSection() {
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.replace('/login');
  }

  return (
    <section style={{ marginTop: 40 }}>
      <SectionHeader
        icon={<User size={15} strokeWidth={2} />}
        title="Conta"
        subtitle="Sessão e configurações avançadas"
      />
      <div style={{ borderTop: '1px solid var(--line-1)', marginBottom: 16 }} />

      <div style={{ padding: '14px 0', borderBottom: '1px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>Encerrar sessão</div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', marginTop: 2 }}>Sair da conta no dispositivo atual</div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            background: 'rgba(180,35,24,0.06)',
            border: '1px solid rgba(180,35,24,0.2)',
            borderRadius: 3,
            color: '#b42318',
            fontSize: '0.82rem',
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(180,35,24,0.06)')}
        >
          <LogOut size={13} />
          Sair
        </button>
      </div>
    </section>
  );
}

// ── Seção Sistema (notificações + atualização) ────────────────────────────────

function SistemaSection() {
  const [settings, setSettings] = useState<Settings>(getSettings);
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <section style={{ marginTop: 40 }}>
      <SectionHeader
        icon={<Bell size={15} strokeWidth={2} />}
        title="Notificações"
        subtitle="Perfil e canais de alertas"
      />
      <div style={{ borderTop: '1px solid var(--line-1)', marginBottom: 16 }} />

      <form onSubmit={handleSave} style={{ maxWidth: 380 }}>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="sys-notif" style={labelStyle}>Perfil de notificação</label>
          <select
            id="sys-notif"
            value={settings.notificationProfile}
            onChange={e => setSettings({ ...settings, notificationProfile: e.target.value })}
            style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
          >
            <option value="completo">Completo</option>
            <option value="somente_critico">Somente crítico</option>
            <option value="silencioso">Silencioso</option>
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="sys-channel" style={labelStyle}>Canal de alertas</label>
          <select
            id="sys-channel"
            value={settings.alertChannel}
            onChange={e => setSettings({ ...settings, alertChannel: e.target.value })}
            style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
          >
            <option value="email">E-mail</option>
            <option value="in_app">No sistema</option>
            <option value="email_e_sistema">E-mail + sistema</option>
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="sys-refresh" style={labelStyle}>Atualização automática</label>
          <select
            id="sys-refresh"
            value={settings.refreshInterval}
            onChange={e => setSettings({ ...settings, refreshInterval: e.target.value })}
            style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
          >
            <option value="5">A cada 5 minutos</option>
            <option value="15">A cada 15 minutos</option>
            <option value="30">A cada 30 minutos</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        {/* Toggle email */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          marginBottom: 20,
          borderBottom: '1px solid var(--line-2)',
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={13} strokeWidth={2} />
              Notificações por e-mail
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', marginTop: 2 }}>
              Receba alertas de atividades por e-mail
            </div>
          </div>
          <label className="toggle-switch" style={{ flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={settings.emailEnabled}
              onChange={e => setSettings({ ...settings, emailEnabled: e.target.checked })}
            />
            <span className="toggle-track" />
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              background: '#034EA2',
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              fontSize: '0.82rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'background 0.12s',
            }}
          >
            {saved ? <><Check size={13} /> Salvo!</> : <><Save size={13} /> Salvar preferências</>}
          </button>
          {saved && (
            <span style={{ fontSize: '0.78rem', color: '#1B8A4B', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Check size={12} strokeWidth={2.5} /> Preferências salvas.
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text)' }}>Configurações</h1>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px 60px', minHeight: 0 }}>
        <div style={{ maxWidth: 580 }}>
          <AvatarHeroCard />
          <PerfilSection />
          <SegurancaSection />
          <AparenciaSection />
          <SistemaSection />
          <ContaSection />
        </div>
      </div>
    </>
  );
}
