'use client';

import { useState, useEffect } from 'react';
import { getUser, setAuth, getToken, isRemembered } from '@/lib/auth';
import { changePassword, updateUserProfile } from '@/lib/api';
import { getSettings, saveSettings } from '@/lib/localStorage';
import type { Settings } from '@/types';
import s from './configuracoes.module.css';

type Section = 'perfil' | 'seguranca' | 'sistema';

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: 'perfil',
    label: 'Informações Pessoais',
    icon: (
      <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
    ),
  },
  {
    id: 'seguranca',
    label: 'Segurança',
    icon: (
      <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    ),
  },
  {
    id: 'sistema',
    label: 'Sistema',
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function ConfiguracoesPage() {
  const [section, setSection] = useState<Section>('perfil');

  return (
    <div className={s.page}>
          {/* ── Left nav ── */}
          <nav className={s.nav}>
            <h2 className={s.navTitle}>Configurações</h2>
            <ul className={s.navList}>
              {NAV.map((item) => (
                <li key={item.id}>
                  <button
                    className={`${s.navItem}${section === item.id ? ' ' + s.active : ''}`}
                    onClick={() => setSection(item.id)}
                  >
                    <span className={s.navIcon}>{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* ── Right content ── */}
          <div className={s.content}>
            <div className={s.contentInner}>
              {section === 'perfil'    && <PerfilSection />}
              {section === 'seguranca' && <SegurancaSection />}
              {section === 'sistema'   && <SistemaSection />}
            </div>
          </div>
        </div>  );
}

// ── Informações Pessoais ───────────────────────────────────────────────────────

function PerfilSection() {
  const [user, setUser]       = useState<ReturnType<typeof getUser>>(null);
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    setName(currentUser?.name ?? '');
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'SIA';

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!name.trim()) { setFeedback({ type: 'error', msg: 'O nome não pode estar vazio.' }); return; }

    setLoading(true);
    try {
      await updateUserProfile(name.trim());
      const token = getToken();
      if (user && token) {
        setAuth(token, { ...user, name: name.trim() }, isRemembered());
      }
      setFeedback({ type: 'success', msg: 'Perfil atualizado com sucesso.' });
    } catch (err: unknown) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Erro ao salvar.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Informações Pessoais</h3>
        <p className={s.sectionSubtitle}>Gerencie seus dados pessoais e como eles aparecem no sistema.</p>
      </div>

      {/* Avatar */}
      <div className={s.avatarRow}>
        <div className={s.avatarCircle}>{initials}</div>
        <div className={s.avatarInfo}>
          <span className={s.avatarName}>{user?.name ?? '—'}</span>
          <span className={s.avatarEmail}>{user?.username ?? '—'}</span>
          <span className={s.avatarBadge}>{user?.role ?? '—'}</span>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className={s.fieldGroup}>
          <div className={s.field}>
            <label className={s.label} htmlFor="pf-name">Nome de exibição</label>
            <input
              id="pf-name"
              type="text"
              className={s.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="pf-username">Usuário</label>
            <input
              id="pf-username"
              type="text"
              className={s.input}
              value={user?.username ?? ''}
              disabled
            />
            <span className={s.inputHint}>O usuário não pode ser alterado por aqui.</span>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="pf-role">Cargo / Perfil</label>
            <input
              id="pf-role"
              type="text"
              className={s.input}
              value={user?.role ?? ''}
              disabled
            />
            <span className={s.inputHint}>Somente administradores podem alterar o perfil.</span>
          </div>
        </div>

        <div className={s.actions}>
          <button type="submit" className={s.btnPrimary} disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar alterações'}
          </button>
          {feedback && (
            <span className={`${s.feedback} ${feedback.type === 'success' ? s.feedbackSuccess : s.feedbackError}`}>
              {feedback.msg}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

// ── Segurança ─────────────────────────────────────────────────────────────────

function SegurancaSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]     = useState(false);
  const [feedback, setFeedback]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (newPassword.length < 6)          { setFeedback({ type: 'error', msg: 'A nova senha deve ter pelo menos 6 caracteres.' }); return; }
    if (newPassword !== confirmPassword) { setFeedback({ type: 'error', msg: 'As senhas não conferem.' }); return; }

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
    <section className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Segurança</h3>
        <p className={s.sectionSubtitle}>Mantenha sua conta segura alterando sua senha periodicamente.</p>
      </div>

      <form onSubmit={handleSave}>
        <div className={s.fieldGroup}>
          <div className={s.field}>
            <label className={s.label} htmlFor="sec-current">Senha atual</label>
            <input
              id="sec-current"
              type="password"
              className={s.input}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Digite sua senha atual"
            />
          </div>

          <div className={s.divider} />

          <div className={s.field}>
            <label className={s.label} htmlFor="sec-new">Nova senha</label>
            <input
              id="sec-new"
              type="password"
              className={s.input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="sec-confirm">Confirmar nova senha</label>
            <input
              id="sec-confirm"
              type="password"
              className={s.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Repita a nova senha"
            />
          </div>
        </div>

        <div className={s.actions}>
          <button type="submit" className={s.btnPrimary} disabled={loading}>
            {loading ? 'Salvando…' : 'Alterar senha'}
          </button>
          {feedback && (
            <span className={`${s.feedback} ${feedback.type === 'success' ? s.feedbackSuccess : s.feedbackError}`}>
              {feedback.msg}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

// ── Sistema ───────────────────────────────────────────────────────────────────

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
    <section className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Configurações do Sistema</h3>
        <p className={s.sectionSubtitle}>Defina padrões de interface e comportamento do ambiente.</p>
      </div>

      <form onSubmit={handleSave}>
        <div className={s.fieldGroup}>
          <div className={s.field}>
            <label className={s.label} htmlFor="sys-notif">Perfil de Notificação</label>
            <select
              id="sys-notif"
              className={s.select}
              value={settings.notificationProfile}
              onChange={(e) => setSettings({ ...settings, notificationProfile: e.target.value })}
            >
              <option value="completo">Completo</option>
              <option value="somente_critico">Somente crítico</option>
              <option value="silencioso">Silencioso</option>
            </select>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="sys-channel">Canal de Alertas</label>
            <select
              id="sys-channel"
              className={s.select}
              value={settings.alertChannel}
              onChange={(e) => setSettings({ ...settings, alertChannel: e.target.value })}
            >
              <option value="email">E-mail</option>
              <option value="in_app">No sistema</option>
              <option value="email_e_sistema">E-mail + sistema</option>
            </select>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="sys-refresh">Atualização Automática</label>
            <select
              id="sys-refresh"
              className={s.select}
              value={settings.refreshInterval}
              onChange={(e) => setSettings({ ...settings, refreshInterval: e.target.value })}
            >
              <option value="5">A cada 5 minutos</option>
              <option value="15">A cada 15 minutos</option>
              <option value="30">A cada 30 minutos</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>

        <div className={s.divider} />

        <div className={s.toggleRow}>
          <div className={s.toggleInfo}>
            <span className={s.toggleLabel}>Notificações por e-mail</span>
            <span className={s.toggleHint}>Receba alertas de atividades por e-mail</span>
          </div>
          <label className={s.toggle}>
            <input
              type="checkbox"
              checked={settings.emailEnabled}
              onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
            />
            <span className={s.toggleSlider} />
          </label>
        </div>

        <div className={s.actions} style={{ marginTop: 24 }}>
          <button type="submit" className={s.btnPrimary}>Salvar preferências</button>
          {saved && (
            <span className={`${s.feedback} ${s.feedbackSuccess}`}>
              Preferências salvas.
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
