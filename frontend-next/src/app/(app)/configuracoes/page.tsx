'use client';

import { useState, useEffect } from 'react';
import { getUser, setAuth, getToken, isRemembered } from '@/lib/auth';
import { changePassword, updateUserProfile } from '@/lib/api';
import { getSettings, saveSettings } from '@/lib/localStorage';
import type { Settings } from '@/types';
import s from './configuracoes.module.css';
import { User, Lock, Settings2, KeyRound, ShieldCheck, Bell, RefreshCw, Mail, Save, Check } from 'lucide-react';

type Section = 'perfil' | 'seguranca' | 'sistema';

const NAV: { id: Section; label: string; Icon: React.ElementType }[] = [
  { id: 'perfil',    label: 'Informações Pessoais', Icon: User },
  { id: 'seguranca', label: 'Segurança',             Icon: Lock },
  { id: 'sistema',   label: 'Sistema',               Icon: Settings2 },
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
                    <span className={s.navIcon}><item.Icon size={15} strokeWidth={2} /></span>
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
        <div className={s.card}>
          <div className={s.cardTitle}>
            <User size={12} strokeWidth={2.5} />
            Dados da conta
          </div>
          <div className={s.fieldGroup}>
            <div className={s.field}>
              <label className={s.label} htmlFor="pf-name">Nome de exibição</label>
              <input id="pf-name" type="text" className={s.input} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              <div className={s.nameWarning}>
                <svg className={s.nameWarningIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p className={s.nameWarningText}>
                  <strong>Atenção: o nome é usado na importação via planilha.</strong>
                  Alterar quebra o vínculo com a coluna de responsável. Comunique previamente a diretoria.
                </p>
              </div>
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="pf-username">Usuário</label>
              <input id="pf-username" type="text" className={s.input} value={user?.username ?? ''} disabled />
              <span className={s.inputHint}>O usuário não pode ser alterado por aqui.</span>
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="pf-role">Cargo / Perfil</label>
              <input id="pf-role" type="text" className={s.input} value={user?.role ?? ''} disabled />
              <span className={s.inputHint}>Somente administradores podem alterar o perfil.</span>
            </div>
          </div>
        </div>

        <div className={s.actions}>
          <button type="submit" className={s.btnPrimary} disabled={loading}>
            {loading ? <><RefreshCw size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Salvando…</> : <><Save size={14} strokeWidth={2} /> Salvar alterações</>}
          </button>
          {feedback && (
            <span className={`${s.feedback} ${feedback.type === 'success' ? s.feedbackSuccess : s.feedbackError}`}>
              {feedback.type === 'success' ? <Check size={13} strokeWidth={2.5} /> : null}
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
        <div className={s.card}>
          <div className={s.cardTitle}><KeyRound size={12} strokeWidth={2.5} /> Senha atual</div>
          <div className={s.fieldGroup}>
            <div className={s.field}>
              <label className={s.label} htmlFor="sec-current">Senha atual</label>
              <input id="sec-current" type="password" className={s.input} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="new-password" placeholder="Digite sua senha atual" />
            </div>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardTitle}><ShieldCheck size={12} strokeWidth={2.5} /> Nova senha</div>
          <div className={s.fieldGroup}>
            <div className={s.field}>
              <label className={s.label} htmlFor="sec-new">Nova senha</label>
              <input id="sec-new" type="password" className={s.input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" placeholder="Mínimo 6 caracteres" />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="sec-confirm">Confirmar nova senha</label>
              <input id="sec-confirm" type="password" className={s.input} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Repita a nova senha" />
            </div>
          </div>
        </div>

        <div className={s.actions}>
          <button type="submit" className={s.btnPrimary} disabled={loading}>
            {loading ? <><RefreshCw size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Salvando…</> : <><Lock size={14} strokeWidth={2} /> Alterar senha</>}
          </button>
          {feedback && (
            <span className={`${s.feedback} ${feedback.type === 'success' ? s.feedbackSuccess : s.feedbackError}`}>
              {feedback.type === 'success' ? <Check size={13} strokeWidth={2.5} /> : null}
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
        <div className={s.card}>
          <div className={s.cardTitle}><Bell size={12} strokeWidth={2.5} /> Notificações</div>
          <div className={s.fieldGroup}>
            <div className={s.field}>
              <label className={s.label} htmlFor="sys-notif">Perfil de Notificação</label>
              <select id="sys-notif" className={s.select} value={settings.notificationProfile} onChange={(e) => setSettings({ ...settings, notificationProfile: e.target.value })}>
                <option value="completo">Completo</option>
                <option value="somente_critico">Somente crítico</option>
                <option value="silencioso">Silencioso</option>
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="sys-channel">Canal de Alertas</label>
              <select id="sys-channel" className={s.select} value={settings.alertChannel} onChange={(e) => setSettings({ ...settings, alertChannel: e.target.value })}>
                <option value="email">E-mail</option>
                <option value="in_app">No sistema</option>
                <option value="email_e_sistema">E-mail + sistema</option>
              </select>
            </div>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardTitle}><RefreshCw size={12} strokeWidth={2.5} /> Atualização</div>
          <div className={s.fieldGroup}>
            <div className={s.field}>
              <label className={s.label} htmlFor="sys-refresh">Atualização Automática</label>
              <select id="sys-refresh" className={s.select} value={settings.refreshInterval} onChange={(e) => setSettings({ ...settings, refreshInterval: e.target.value })}>
                <option value="5">A cada 5 minutos</option>
                <option value="15">A cada 15 minutos</option>
                <option value="30">A cada 30 minutos</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
        </div>

        <div className={s.toggleRow}>
          <div className={s.toggleInfo}>
            <span className={s.toggleLabel}><Mail size={13} strokeWidth={2} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Notificações por e-mail</span>
            <span className={s.toggleHint}>Receba alertas de atividades por e-mail</span>
          </div>
          <label className={s.toggle}>
            <input type="checkbox" checked={settings.emailEnabled} onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })} />
            <span className={s.toggleSlider} />
          </label>
        </div>

        <div className={s.actions}>
          <button type="submit" className={s.btnPrimary}>
            {saved ? <><Check size={14} strokeWidth={2.5} /> Salvo!</> : <><Save size={14} strokeWidth={2} /> Salvar preferências</>}
          </button>
          {saved && <span className={`${s.feedback} ${s.feedbackSuccess}`}><Check size={13} strokeWidth={2.5} /> Preferências salvas.</span>}
        </div>
      </form>
    </section>
  );
}
